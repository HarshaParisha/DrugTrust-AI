# Drugtrust AI Setup: Kaggle & Database

Thank you for setting up Drugtrust AI! To populate the system with 11,000+ medicine records, we need to connect to the Kaggle API. Follow these simple steps.

---

## 1. Get Your Kaggle API Key

If you don't have a Kaggle account, create one at [kaggle.com](https://www.kaggle.com).

1. Log in to Kaggle.
2. Click on your profile picture (top right) and select **Settings**.
3. Scroll down to the **API** section.
4. Click **Create New Token**.
5. This will download a file named `kaggle.json`.

---

## 2. Place the API Key Correctly

You must place `kaggle.json` in a specific folder so the script can find it.

### **Windows**

1. Open your File Explorer.
2. Go to your User folder: `C:\Users\<Your_Username>\`.
3. Create a folder named `.kaggle` (note the dot).
4. Paste the `kaggle.json` file inside that folder.
   - Final path: `C:\Users\<Your_Username>\.kaggle\kaggle.json`

### **Linux / macOS**

1. Open your terminal.
2. Run: `mkdir -p ~/.kaggle`
3. Copy the file: `cp ~/Downloads/kaggle.json ~/.kaggle/`
4. Secure it: `chmod 600 ~/.kaggle/kaggle.json`

---

## 3. Run the Importer

Once the file is placed, you can build your medicine database.

1. Open your terminal in the `medverify` folder.
2. Install dependencies:
   ```bash
   pip install pandas kaggle openpyxl
   ```
3. Run the import script:
   ```bash
   python backend/scripts/build_medicines_db.py
   ```
4. Verify the database:
   ```bash
   python backend/scripts/validate_db.py
   ```

---

## Troubleshooting

- **"Kaggle API failed":** Double-check that the folder is named exactly `.kaggle` and the file is `kaggle.json`.
- **Slow Download:** The dataset is about 15MB. It may take a few seconds depending on your internet.
- **Excel Errors:** If you get an openpyxl error, move the `.csv` file directly into `data/raw/` manually from the Kaggle website.
