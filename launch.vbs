Set WshShell = CreateObject("WScript.Shell")
projectDir = "C:\Users\xantares\.gemini\antigravity\scratch\immersive-music-player"
electronExe = projectDir & "\node_modules\electron\dist\electron.exe"

WshShell.CurrentDirectory = projectDir
WshShell.Run """" & electronExe & """ """ & projectDir & """", 1, False

