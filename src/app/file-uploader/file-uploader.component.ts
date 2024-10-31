import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.css']
})
export class FileUploaderComponent {
  files: File[] = []; // Array to store multiple files
  chunkSize: number = 10 * 1024 * 1024;
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

  private uploadFileChunks(file: File, fileIndex: number, currentChunk: number = 0, retryCount: number = 0) {
    const start = currentChunk * this.chunkSize;
    const end = Math.min(start + this.chunkSize, file.size);
    const chunk = file.slice(start, end);
    const chunkName = `${file.name}.part${currentChunk}`;
    this.chunkNames[file.name].push(chunkName);

    const formData = new FormData();
    formData.append('file', chunk, chunkName);
    formData.append('fileName', file.name);
    formData.append('chunkIndex', currentChunk.toString());

    this.http.post('http://localhost:8080/upload/chunk', formData).subscribe({
      next: () => {
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

  private mergeChunks(fileName: string) {
    this.http.post(`http://localhost:8080/upload/merge?fileName=${fileName}`, {}).subscribe({
      next: () => {
        this.message = { text: 'File merged successfully!', type: 'success' };
        setTimeout(() => window.location.reload(), 1000); // Refresh page after 1 seconds
      },
      error: (err) => {
        this.message = { text: 'Error merging file: ' + (err.error?.message || 'Unknown error'), type: 'error' };
      }
    });
  }
}
