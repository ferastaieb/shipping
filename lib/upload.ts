import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

/**
 * saveFileLocally
 * - Saves a File object to a subdirectory under `public/uploads/` and returns a relative URL.
 * 
 * @param file - The File object to save.
 * @param folderPath - The subfolder path (e.g., "customer/994874996"). Leading/trailing slashes are optional.
 * @returns The public URL path to the saved file.
 */
export async function saveFileLocally(file: File, folderPath: string): Promise<string> {
  // Normalize the folderPath by removing any leading/trailing slashes
  const normalizedFolder = folderPath.replace(/^\/+|\/+$/g, '')

  // Convert File to a Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Generate a random filename to avoid collisions
  const fileName = `${randomUUID()}-${file.name}`
  
  // Define the uploads directory including the subfolder
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', normalizedFolder)

  // Ensure the uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  // Write the file to disk
  const filePath = path.join(uploadsDir, fileName)
  fs.writeFileSync(filePath, buffer)

  // Return the public URL path
  return `/uploads/${normalizedFolder}/${fileName}`
}
