' Menjalankan jalankan.bat tanpa jendela (dipakai oleh autostart).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "cmd /c jalankan.bat bg", 0, False
