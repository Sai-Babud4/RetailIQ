import os
import shutil

SOURCE_DIR = r"d:\Antigravity"
TARGET_DIR = r"d:\Antigravity\RetailIQ_GitHub_Deploy"

print(f"Creating clean export package at: {TARGET_DIR}")

# Preserve existing .git folder if user has already initialized git in TARGET_DIR
git_backup = None
git_dir = os.path.join(TARGET_DIR, ".git")
if os.path.exists(git_dir):
    temp_git = os.path.join(SOURCE_DIR, ".git_temp_backup")
    if os.path.exists(temp_git):
        shutil.rmtree(temp_git, ignore_errors=True)
    print("  Preserving existing .git repository...")
    shutil.move(git_dir, temp_git)
    git_backup = temp_git

# Remove existing target except .git
if os.path.exists(TARGET_DIR):
    shutil.rmtree(TARGET_DIR, ignore_errors=True)
os.makedirs(TARGET_DIR, exist_ok=True)

# Restore .git folder if preserved
if git_backup and os.path.exists(git_backup):
    shutil.move(git_backup, git_dir)
    print("  Restored .git repository.")

def ignore_patterns(path, names):
    ignored = set()
    for name in names:
        if name in ["__pycache__", ".pytest_cache", "node_modules", "dist"]:
            ignored.add(name)
        elif name.endswith(".pyc") or name.endswith(".pyo"):
            ignored.add(name)
    return ignored

# 1. Copy backend
print("  Copying backend...")
shutil.copytree(os.path.join(SOURCE_DIR, "backend"), os.path.join(TARGET_DIR, "backend"), ignore=ignore_patterns)

# 2. Copy data (ensure both Excel dataset and pre-populated SQLite db are included)
print("  Copying data...")
os.makedirs(os.path.join(TARGET_DIR, "data"), exist_ok=True)
db_src = os.path.join(SOURCE_DIR, "backend", "data", "retailiq.db")
if os.path.exists(db_src):
    shutil.copy2(db_src, os.path.join(TARGET_DIR, "data", "retailiq.db"))
excel_src = os.path.join(SOURCE_DIR, "RetailIQ_Inventory_Agent_Datasets.xlsx")
if os.path.exists(excel_src):
    shutil.copy2(excel_src, os.path.join(TARGET_DIR, "data", "RetailIQ_Inventory_Agent_Datasets.xlsx"))

# 3. Copy docs, scripts, tests
for folder in ["docs", "scripts", "tests"]:
    src_f = os.path.join(SOURCE_DIR, folder)
    if os.path.exists(src_f):
        print(f"  Copying {folder}...")
        shutil.copytree(src_f, os.path.join(TARGET_DIR, folder), ignore=ignore_patterns)

# 4. Copy api directory (including api/index.py, api/requirements.txt, api/data/retailiq.db, api/backend/)
print("  Setting up self-contained api directory for Vercel...")
api_target = os.path.join(TARGET_DIR, "api")
os.makedirs(api_target, exist_ok=True)
shutil.copy2(os.path.join(SOURCE_DIR, "api", "index.py"), os.path.join(api_target, "index.py"))
if os.path.exists(os.path.join(SOURCE_DIR, "api", "requirements.txt")):
    shutil.copy2(os.path.join(SOURCE_DIR, "api", "requirements.txt"), os.path.join(api_target, "requirements.txt"))

# Self-contained backend and data inside api/
os.makedirs(os.path.join(api_target, "data"), exist_ok=True)
if os.path.exists(db_src):
    shutil.copy2(db_src, os.path.join(api_target, "data", "retailiq.db"))
shutil.copytree(os.path.join(SOURCE_DIR, "backend"), os.path.join(api_target, "backend"), ignore=ignore_patterns)

# 5. Copy frontend cleanly without node_modules or dist
print("  Copying frontend source...")
shutil.copytree(os.path.join(SOURCE_DIR, "frontend"), os.path.join(TARGET_DIR, "frontend"), ignore=ignore_patterns)

# 6. Copy root configuration files
root_files = [
    ".gitignore",
    ".env.example",
    "README.md",
    "requirements.txt",
    "vercel.json",
    "RetailIQ_Inventory_Agent_Datasets.xlsx",
    "run_retailiq.bat",
    "run_retailiq.ps1",
    "push_to_github.bat",
    "push_to_github.ps1"
]

for f in root_files:
    src_file = os.path.join(SOURCE_DIR, f)
    dst_file = os.path.join(TARGET_DIR, f)
    if os.path.exists(src_file):
        print(f"  Copying {f}...")
        shutil.copy2(src_file, dst_file)

print("\nDeployment package created successfully at:")
print(f"  {TARGET_DIR}")
