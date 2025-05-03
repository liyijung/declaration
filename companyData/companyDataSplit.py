import csv
import os

input_file = r'C:\Users\Admin\Desktop\companyData.csv'  # 原始檔案路徑
output_dir = r'C:\Users\Admin\Desktop\companyData'      # 輸出資料夾
os.makedirs(output_dir, exist_ok=True)

# 預先建立 0–9 的輸出 writer
writers = {}
files = {}

with open(input_file, 'r', encoding='utf-8-sig', newline='') as infile:
    reader = csv.reader(infile)
    headers = next(reader)

    for digit in range(10):
        out_path = os.path.join(output_dir, f'companyData{digit}.csv')
        f = open(out_path, 'w', encoding='utf-8-sig', newline='')
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)  # 每個欄位都加上雙引號
        writer.writerow(headers)
        writers[str(digit)] = writer
        files[str(digit)] = f

    for row in reader:
        tax_id = row[0].strip()
        if tax_id and tax_id[0].isdigit():
            first_digit = tax_id[0]
            if first_digit in writers:
                writers[first_digit].writerow(row)

# 關閉所有輸出檔案
for f in files.values():
    f.close()

print("✅ 分割完成。輸出位於：", output_dir)