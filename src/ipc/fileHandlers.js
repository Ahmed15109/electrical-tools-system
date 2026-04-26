const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');






function handleUploadFile() {
    ipcMain.handle('system:uploadFile', async (event, { sourcePath, subdirectory = 'uploads' }) => {
        try {
            if (!sourcePath || !fs.existsSync(sourcePath)) {
                return { success: false, message: 'File does not exist or path is invalid.' };
            }


            const targetDir = path.join(app.getPath('userData'), subdirectory);


            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }


            const ext = path.extname(sourcePath).toLowerCase();
            const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}${ext}`;
            const targetPath = path.join(targetDir, uniqueFilename);


            const { nativeImage } = require('electron');
            const img = nativeImage.createFromPath(sourcePath);


            let buffer;
            if (!img.isEmpty()) {
                 const size = img.getSize();
                 if (size.width > 1024) {
                      const resized = img.resize({ width: 1024 });
                      buffer = resized.toJPEG(80); 
                 } else {
                      buffer = img.toJPEG(80); 
                 }
            } else {

                 buffer = fs.readFileSync(sourcePath);
            }


            let finalTarget = targetPath;
            if (!img.isEmpty()) {
                 const newFilename = uniqueFilename.replace(ext, '.jpg');
                 finalTarget = path.join(targetDir, newFilename);
            }

            fs.writeFileSync(finalTarget, buffer);

            console.log(`[Upload System] Saved and Optimized file to: ${finalTarget}`);

            return { 
                success: true, 
                filePath: finalTarget
            };

        } catch (err) {
            console.error(`[Upload System] Error uploading file: ${err.message}`);
            return { success: false, message: err.message };
        }
    });
}

function registerSystemHandlers() {
    handleUploadFile();
}

module.exports = { registerSystemHandlers };
