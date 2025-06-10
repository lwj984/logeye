const { app, BrowserWindow, ipcMain } = require('electron');
const https = require('https');
const path = require('path');

// 创建主窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    frame: false
  });

  // 加载应用界面
  mainWindow.loadFile('logeye.html');

  // 开发工具
  // mainWindow.webContents.openDevTools();
}

// 当 Electron 初始化完成时
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 处理获取日志的请求
ipcMain.handle('fetchLogs', async (event, { cookie, csrfToken, traceId, from, to }) => {
  console.log(`[API Call] 请求日志: traceId=${traceId}, from=${new Date(from*1000).toISOString()}, to=${new Date(to*1000).toISOString()}`);
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      ProjectName: 'lx-mars-pro',
      LogStoreName: 'lx-mars-pro',
      from: from,
      to: to,
      query: `trace_id:${traceId} | with_pack_meta`,
      Page: 1,
      Size: 50,
      Reverse: 'true',
      pSql: 'false',
      fullComplete: 'false',
      schemaFree: 'false',
      needHighlight: 'true'
    }).toString();

    const options = {
      hostname: 'sls.console.aliyun.com',
      path: '/console/logs/getLogs.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': cookie,
        'x-csrf-token': csrfToken,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          // 调试日志 - 打印整个响应结构
          console.log('API Response:', JSON.stringify(result, null, 2));
          
          // 检查不同可能的响应结构
          let logs = [];
          
          // 结构1: result.data.logs
          if (result && result.data && Array.isArray(result.data.logs)) {
            logs = result.data.logs;
          } 
          // 结构2: result.data.data
          else if (result && result.data && Array.isArray(result.data.data)) {
            logs = result.data.data;
          }
          // 结构3: 直接返回数组
          else if (Array.isArray(result.data)) {
            logs = result.data;
          }
          // 结构4: 直接返回数组
          else if (Array.isArray(result)) {
            logs = result;
          }
          // 结构5: result.logs
          else if (result && Array.isArray(result.logs)) {
            logs = result.logs;
          }
          
          if (logs.length > 0) {
            console.log(`[API Success] 获取到 ${logs.length} 条日志`);
            resolve(logs);
          } else {
            console.error('[API Error] 未获取到有效日志数据');
            reject(new Error('未获取到有效日志数据'));
          }
        } catch (error) {
          console.error('[Parse Error] 解析日志数据失败:', error.message);
          reject(new Error('解析日志数据失败'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
});

// 窗口控制
ipcMain.on('minimize-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.on('close-window', () => {
  app.quit();
});