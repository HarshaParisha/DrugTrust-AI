import sqlite3
import os

db_path = os.path.join("data", "medverify.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT scan_id, image_hash, medicine_name FROM scan_records WHERE medicine_name LIKE '%Olidol%';")
results = cursor.fetchall()
print(results)
conn.close()
