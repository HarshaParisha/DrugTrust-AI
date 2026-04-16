"""
MedVerify — GradCAM heatmap generator
"""

import numpy as np
import torch
import torch.nn as nn
import logging
from typing import Optional, List, Any


class GradCAM:
    """Gradient-weighted Class Activation Mapping for any CNN layer."""

    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self._hooks = []
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self._hooks.append(self.target_layer.register_forward_hook(forward_hook))
        self._hooks.append(self.target_layer.register_full_backward_hook(backward_hook))

    def remove_hooks(self):
        for h in self._hooks:
            h.remove()
        self._hooks = []

    def generate(self, input_tensor: torch.Tensor, class_idx: Optional[int] = None) -> np.ndarray:
        self.model.eval()
        self.model.zero_grad()

        output = self.model(input_tensor)
        if class_idx is None:
            class_idx = int(output.argmax(dim=1).item())

        score = output[0, class_idx]
        score.backward()

        if self.gradients is None or self.activations is None:
            logger = logging.getLogger("medverify.gradcam")
            logger.warning("Gradients or activations not captured. Returns zero heatmap.")
            return np.zeros((input_tensor.shape[2], input_tensor.shape[3]))

        # Pool gradients over spatial dims
        pooled_grads = self.gradients.mean(dim=[0, 2, 3])

        # Weight activation maps
        activations = self.activations[0]  # (C, H, W)
        for i, w in enumerate(pooled_grads):
            activations[i] *= w

        cam = activations.mean(dim=0).cpu().numpy()
        cam = np.maximum(cam, 0)  # ReLU
        cam -= cam.min()
        if cam.max() > 0:
            cam /= cam.max()
        return cam
