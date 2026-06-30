# Windows System Debloat & Optimization for Trading
## Complete Guide to Remove Startup Tasks & Background Processes

**Goal:** Eliminate all non-essential background processes. Keep only:
- ✅ Windows Defender (virus protection)
- ✅ Trading platforms (NinjaTrader, broker apps)
- ✅ Essential Windows services
- ✅ Network drivers

---

## PHASE 1: DISABLE OPENCLAW STARTUP TASK (5 minutes)

### Option A: Remove OpenClaw from Startup (Recommended)

**Windows 10/11:**

1. Press `Windows Key + R`
2. Type `shell:startup` and press Enter
3. Look for any OpenClaw shortcuts
4. **Right-click → Delete** any OpenClaw startup files
5. Done — OpenClaw will no longer auto-launch

**Alternative: Check Task Scheduler**

1. Press `Windows Key + R`
2. Type `taskschd.msc` and press Enter
3. Go to **Task Scheduler Library**
4. Search for any tasks containing "openclaw", "harreson", or "gateway"
5. **Right-click → Disable** or **Delete** each one
6. Click "Refresh" to confirm removal

---

## PHASE 2: DISABLE UNNECESSARY WINDOWS SERVICES (15 minutes)

**CRITICAL:** Only disable if NOT used. Start with the safest ones.

### Open Services:
1. Press `Windows Key + R`
2. Type `services.msc` and press Enter

### SAFE TO DISABLE (Bloatware):

| Service | Current Status | Action |
|---------|---------------|--------|
| **Superfetch** | Usually On | Disable (RAM hog) |
| **Windows Update** | Usually On | Set to Manual (disable auto-check) |
| **OneDrive** | Usually On | Disable (if not using) |
| **Cortana** | Usually On | Disable (RAM/CPU drain) |
| **DiagTrack** (Connected User Experiences) | Usually On | Disable (telemetry) |
| **dmwappushservice** | Usually On | Disable (advertising) |
| **Print Spooler** | Usually On | Disable (not needed for trading) |
| **Windows Search** | Usually On | Disable (indexing RAM hog) |
| **Xbox Live** | Usually On | Disable (if gaming not needed) |
| **Bluetooth** | Usually On | Disable (if not using) |

### HOW TO DISABLE EACH:

1. Find the service in the list (type name to jump to it)
2. **Right-click → Properties**
3. Set **Startup type** to one of:
   - `Disabled` = Never starts
   - `Manual` = Only starts if something needs it
4. Click **Stop** (stops it now)
5. Click **Apply → OK**
6. Restart Windows for changes to take full effect

---

## PHASE 3: DISABLE STARTUP PROGRAMS (10 minutes)

### Open Task Manager:
1. Press `Ctrl + Shift + Esc` (or `Windows Key + R`, type `taskmgr`)
2. Click **Startup** tab

### Programs to DISABLE:

| Program | Safe to Disable? | Why |
|---------|-----------------|-----|
| OneDrive | YES | Syncs in background |
| Cortana | YES | Voice assistant (CPU drain) |
| Skype | YES | If not using |
| Discord | YES | If not using |
| Spotify | YES | If not using |
| Adobe Reader | YES | Not needed constantly |
| Java Update Scheduler | YES | Updates can be manual |
| iCloud | YES | If not using |
| Antivirus (3rd party) | **NO** | Keep Windows Defender only |
| GPU drivers (NVIDIA/AMD) | **KEEP** | Needed for display |
| Chipset drivers | **KEEP** | System stability |

### HOW TO DISABLE:

1. Right-click any program in Startup tab
2. Click **Disable**
3. Restart Windows

---

## PHASE 4: REMOVE BLOATWARE APPS (10 minutes)

### Go to Settings → Apps → Installed Apps

**SAFE TO UNINSTALL:**
- ❌ Candy Crush, Solitaire, other games
- ❌ Microsoft Clipchamp
- ❌ Microsoft Solitaire Collection
- ❌ Mail, Calendar (if not using)
- ❌ News
- ❌ Weather
- ❌ Messaging
- ❌ Groove Music
- ❌ Movies & TV
- ❌ Photos (if not using)
- ❌ 3D Builder
- ❌ Mixed Reality Viewer
- ❌ Voice Recorder

**DO NOT UNINSTALL:**
- ✅ Windows Defender (security)
- ✅ Windows Firewall
- ✅ Settings
- ✅ File Explorer
- ✅ Any GPU drivers
- ✅ Network drivers

### HOW TO UNINSTALL:

1. Settings → Apps → Installed Apps
2. Search for app name
3. Click on it → **Uninstall** → Confirm

---

## PHASE 5: OPTIMIZE WINDOWS SETTINGS (5 minutes)

### Disable Visual Effects (frees up RAM/GPU):

1. Right-click **This PC** → **Properties**
2. Click **Advanced system settings** (left sidebar)
3. Under **Performance**, click **Settings**
4. Select **Adjust for best performance** (disables animations)
5. Click **Apply → OK → OK**

### Disable Background Apps:

1. Settings → Privacy & Security → App permissions
2. Click **Background apps**
3. Toggle OFF for any apps not needed during trading
4. Keep only Defender, network drivers, essential Windows services

### Disable Notifications:

1. Settings → System → Notifications
2. Toggle OFF most categories (notifications = interruptions during trading)
3. Keep only Windows Security notifications ON

---

## PHASE 6: DISABLE POWER THROTTLING (Gaming Mode Setup)

### For Maximum Trading Performance:

1. Settings → System → Power & Battery
2. Scroll down → **Power Plan** → **Change advanced power settings**
3. Expand **Processor power management**
4. Set both to **High performance**:
   - Minimum processor state: **100%**
   - Maximum processor state: **100%**
5. Click **Apply → OK**

### Alternative: Use Game Mode (Windows 11)

1. Settings → Gaming → Game Mode
2. Toggle **ON**
3. This prioritizes your trading app over background processes

---

## PHASE 7: CLEAN UP DISK (Optional but recommended: 10 minutes)

### Run Disk Cleanup:

1. Press `Windows Key + R`
2. Type `cleanmgr` and press Enter
3. Select your C: drive
4. Check these categories:
   - ✅ Temporary Internet Files
   - ✅ Downloaded Program Files
   - ✅ Recycle Bin
   - ✅ Windows Update Cleanup
5. Click **OK → Delete Files**

### Empty Temp Folder:

1. Press `Windows Key + R`
2. Type `%temp%` and press Enter
3. Select all files (Ctrl+A)
4. Delete (some may say "in use" — skip those)

---

## PHASE 8: DISABLE OPENCLAW WSL/GATEWAY ON BOOT

**Since OpenClaw runs on WSL (Linux subsystem), you may want to disable it completely or start it manually when needed.**

### Option 1: Disable WSL at Boot (Most Aggressive)

1. Press `Windows Key + R`
2. Type `optionalfeatures` and press Enter
3. Uncheck **Windows Subsystem for Linux**
4. Click **OK** → Restart Windows
5. **Result:** WSL/OpenClaw never start automatically

### Option 2: Keep WSL but Disable OpenClaw Only

1. Find OpenClaw startup file/service and disable it (done in Phase 1)
2. **Result:** WSL stays installed but OpenClaw doesn't auto-start

### Option 3: Run OpenClaw Only When Needed (Flexible)

1. Create a batch file: `Start-OpenClaw.bat`
   ```
   @echo off
   wsl -d Ubuntu openclaw gateway --port 18789
   pause
   ```
2. Save in `C:\Users\[YourUsername]\Desktop\`
3. Double-click to start OpenClaw only when you want it

---

## FINAL CHECKLIST

After completing all phases, your system should have:

- ✅ **DISABLED:**
  - OpenClaw auto-startup
  - Superfetch
  - Windows Search
  - OneDrive
  - Cortana
  - DiagTrack
  - Print Spooler
  - Xbox services
  - Bluetooth (if not using)
  - Non-essential startup apps
  - Visual animations
  - Background app notifications

- ✅ **ENABLED:**
  - Windows Defender
  - Windows Firewall
  - GPU drivers
  - Network drivers
  - High performance power plan
  - Game Mode (if Windows 11)

- ✅ **UNINSTALLED:**
  - All bloatware games
  - Microsoft store apps (except Defender)
  - Duplicate antivirus (keep Defender only)

---

## EXPECTED RESULTS

**Before optimization:**
- RAM usage: 60-75%
- CPU idle: 15-25%
- Disk usage: Constant background activity

**After optimization:**
- RAM usage: 25-35%
- CPU idle: 1-5%
- Disk usage: Quiet (only when actively trading)

---

## SYSTEM RESTART REQUIRED

**Restart Windows after completing these steps.** Changes take full effect only after reboot.

---

## EMERGENCY ROLLBACK

If something breaks, you can:

1. **Undo service changes:** `services.msc` → right-click service → Properties → Startup type set back to `Automatic`
2. **Undo startup changes:** Task Manager → Startup tab → right-click → Enable
3. **Re-enable WSL:** `optionalfeatures` → re-check Windows Subsystem for Linux
4. **System Restore:** `rstrui.exe` → Restore to point before changes

---

## CUSTOM BATCH FILE TO VERIFY CLEAN STATE

Save this as `CheckSystemLoad.bat` and run after restart:

```batch
@echo off
echo ===== SYSTEM LOAD CHECK =====
tasklist | find /c /v "" >temp.txt
for /f %%a in (temp.txt) do echo Total processes running: %%a
echo.
wmic os get totalvisiblememorysize,freephysicalmemory | findstr /v "^$"
echo.
wmic cpu get loadpercentage
echo.
echo If processes < 50 and free memory > 50%% of total, you're good!
pause
```

---

## SUPPORT

If you encounter issues:
1. Document exactly which service/app you disabled
2. Use System Restore to rollback if needed
3. Restart Windows — many changes only take effect after reboot
4. Disable one service at a time to identify the culprit

---

**Last Updated:** June 11, 2026  
**Optimization Goal:** Trading-only system with minimal background load
