import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.css']
})
export class FileUploaderComponent {
  files: File[] = [];
  chunkSize: number = 10 * 1024 * 1024; // Start with 10 MB
  maxChunkSize: number = 50 * 1024 * 1024;
  minChunkSize: number = 10 * 1024 * 1024;
  progress: number[] = [];
  uploading: boolean = false;
  chunkNames: { [fileName: string]: string[] } = {};
  message: { text: string; type: string } | null = null;

  constructor(private http: HttpClient) {}

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.files = Array.from(input.files);
      this.progress = new Array(this.files.length).fill(0);
      this.chunkNames = {};
      this.files.forEach(file => this.chunkNames[file.name] = []);
      this.message = null;
    }
  }

  uploadFiles() {
    this.uploading = true;
    this.files.forEach((file, index) => this.uploadFileChunks(file, index));
  }

  private async uploadFileChunks(file: File, fileIndex: number, currentChunk: number = 0, retryCount: number = 0) {
    const start = currentChunk * this.chunkSize;
    const end = Math.min(start + this.chunkSize, file.size);
    const chunk = file.slice(start, end);
    const chunkName = `${file.name}.part${currentChunk}`;
    this.chunkNames[file.name].push(chunkName);

    // Calculate SHA-256 hash for the chunk
    const chunkHash = await this.calculateSHA256(chunk);

    const formData = new FormData();
    formData.append('file', chunk, chunkName);
    formData.append('fileName', file.name);
    formData.append('chunkIndex', currentChunk.toString());
    formData.append('chunkHash', chunkHash); // Send hash with other parameters

    const startTime = Date.now(); // Start time tracking

    this.http.post('http://localhost:8080/upload/chunk', formData).subscribe({
      next: () => {
        const duration = Date.now() - startTime; // Calculate duration
        const uploadSpeed = (chunk.size / duration) * 1000; // Bytes per second

        // Adjust chunk size based on upload speed
        if (uploadSpeed > 10 * 1024 * 1024) { // 10 MB/s threshold
          this.chunkSize = this.maxChunkSize; // Use max chunk size
        } else {
          this.chunkSize = this.minChunkSize; // Use min chunk size
        }

        this.progress[fileIndex] = Math.min(100, Math.floor((end / file.size) * 100));
        if (start + this.chunkSize < file.size) {
          this.uploadFileChunks(file, fileIndex, currentChunk + 1);
        } else {
          this.message = { text: 'File uploaded successfully!', type: 'success' };
          setTimeout(() => this.mergeChunks(file.name), 1000);
        }
      },
      error: (err) => {
        if (retryCount < 3) {
          this.uploadFileChunks(file, fileIndex, currentChunk, retryCount + 1);
        } else {
          this.uploading = false;
          this.message = { text: `Error uploading chunk of ${file.name}: ` + (err.error?.message || 'Unknown error'), type: 'error' };
        }
      }
    });
  }

  // Function to calculate SHA-256 hash of a chunk
  private async calculateSHA256(chunk: Blob): Promise<string> {
    const arrayBuffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private mergeChunks(fileName: string) {
    this.http.post(`http://localhost:8080/upload/merge?fileName=${fileName}`, {}).subscribe({
      next: () => {
        this.message = { text: 'File merged successfully!', type: 'success' };
        setTimeout(() => window.location.reload(), 1000); // Refresh page after 1 second
      },
      error: (err) => {
        this.message = { text: 'Error merging file: ' + (err.error?.message || 'Unknown error'), type: 'error' };
      }
    });
  }
}
