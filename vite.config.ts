import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function saveAnswersPlugin(): Plugin {
  return {
    name: 'save-answers-api',
    configureServer(server) {
      server.middlewares.use('/api/save-answers', (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              const filePath = path.resolve(__dirname, 'answers.json')
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')

              const publicDir = path.resolve(__dirname, 'public')
              if (fs.existsSync(publicDir)) {
                fs.writeFileSync(path.resolve(publicDir, 'answers.json'), JSON.stringify(data, null, 2), 'utf-8')
              }

              if (data.verificationPhoto && typeof data.verificationPhoto === 'string' && data.verificationPhoto.startsWith('data:image/')) {
                try {
                  const base64Data = data.verificationPhoto.replace(/^data:image\/\w+;base64,/, '')
                  const buffer = Buffer.from(base64Data, 'base64')
                  fs.writeFileSync(path.resolve(__dirname, 'verification-selfie.jpg'), buffer)
                } catch { }
              }
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, path: filePath }))
            } catch {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Failed to write json' }))
            }
          })
        } else {
          res.statusCode = 405
          res.end('Method Not Allowed')
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), saveAnswersPlugin()]
})
