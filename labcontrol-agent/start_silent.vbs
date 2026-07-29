Set WshShell = CreateObject("WScript.Shell") 
WshShell.CurrentDirectory = "C:\Users\Tushal\Desktop\LabControl\labcontrol-agent" 
WshShell.Run """C:\Users\Tushal\AppData\Local\Programs\Python\Python312\pythonw.exe"" ""C:\Users\Tushal\Desktop\LabControl\labcontrol-agent\agent.py""", 0, False 
