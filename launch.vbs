Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Users\ELKIN\Desktop\ChatGÜIRE\apps\api"" && pnpm dev", 1, False
WScript.Sleep 6000
WshShell.Run "cmd /c cd /d ""C:\Users\ELKIN\Desktop\ChatGÜIRE\apps\web"" && pnpm dev", 1, False