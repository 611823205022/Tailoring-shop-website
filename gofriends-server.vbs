Set ws = CreateObject("WScript.Shell")
ws.CurrentDirectory = "C:\Users\Gokulraj S\OneDrive\Desktop\website Tailor shop"
Do
  ws.Run "node.exe server.js", 0, True
  WScript.Sleep 3000
Loop