import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Proxy for SRT files
app.use('/proxy/srt', createProxyMiddleware({
    target: 'http://down.wjthinkbig.com',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy/srt': '',
    },
}));

// Proxy for HLS video files
app.use('/proxy/hls', createProxyMiddleware({
    target: 'http://hlsmedia.wjthinkbig.com',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy/hls': '',
    },
}));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React routing, return all requests to React app
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the app`);
});
