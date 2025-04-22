import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const FRAMES_DIR = path.join(__dirname, "../../frames");
const MAX_FRAMES = 10; // Maximum number of frames to extract
const FRAME_INTERVAL = 3; // Extract frame every X seconds

// Ensure frames directory exists
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

export const extractFrames = async (
  videoPath: string
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const frames: string[] = [];
    const videoId = path.basename(videoPath, path.extname(videoPath));

    // Get video duration
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata.format.duration || 0;
      const totalFrames = Math.min(
        Math.ceil(duration / FRAME_INTERVAL),
        MAX_FRAMES
      );

      if (totalFrames === 0) {
        reject(new Error("Video is too short"));
        return;
      }

      // Calculate timestamps for frame extraction
      const timestamps = Array.from({ length: totalFrames }, (_, i) => 
        Math.floor((i * duration) / totalFrames)
      );

      ffmpeg(videoPath)
        .on("end", () => {
          resolve(frames);
        })
        .on("error", (err) => {
          reject(err);
        })
        .screenshots({
          timestamps: timestamps,
          filename: `${videoId}-%s.png`,
          folder: FRAMES_DIR,
          size: "320x240",
        })
        .on("filenames", (filenames) => {
          frames.push(...filenames.map((f) => path.join(FRAMES_DIR, f)));
        });
    });
  });
};

export const processImage = async (imagePath: string): Promise<Buffer> => {
  return sharp(imagePath)
    .resize(800, 600, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
};
