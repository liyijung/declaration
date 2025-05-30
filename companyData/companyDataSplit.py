import os

input_file = r'C:\Users\Admin\Desktop\companyData.csv'  # 原始檔案路徑
output_dir = r'C:\Users\Admin\Desktop\companyData'      # 輸出資料夾
os.makedirs(output_dir, exist_ok=True)

# 建立 0~9 的暫存檔
files = {str(d): open(os.path.join(output_dir, f'companyData{d}.csv'), 'w', encoding='utf-8') for d in range(10)}

with open(input_file, 'r', encoding='utf-8') as infile:
    header = infile.readline()
    for f in files.values():
        f.write(header)  # 每個檔案寫入表頭

    for line in infile:
        # 擷取統一編號的第一碼
        first_quote = line.find('"')
        next_quote = line.find('"', first_quote + 1)
        tax_id = line[first_quote + 1:next_quote]

        if tax_id and tax_id[0].isdigit():
            first_digit = tax_id[0]
            if first_digit in files:
                files[first_digit].write(line)

# 關閉所有檔案
for f in files.values():
    f.close()

print("依統一編號首碼分類，且完全保留原始格式。")
