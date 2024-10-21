import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.css']
})
export class FileUploaderComponent {
  file: File | null = null;
  chunkSize: number = 10 * 1024 * 1024; // Default chunk size is 10 MB
  maxChunkSize: number = 50 * 1024 * 1024; // 50 MB chunk size for good network
  minChunkSize: number = 10 * 1024 * 1024; // 10 MB chunk size for poor network
  currentChunk: number = 0;
  progress: number = 0; // Upload progress percentage as a whole number
  uploading: boolean = false; // Flag to track upload status
  progressDecimal: string = '0'; // Progress as a whole number string
  chunkNames: string[] = []; // Array to store chunk names

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.file = input.files[0];
      this.currentChunk = 0;
      this.progress = 0;
      this.uploading = false;
      this.progressDecimal = '0'; // Reset decimal progress
      this.chunkNames = []; // Reset chunk names
    }
  }

  uploadFile() {
    if (!this.file) {
      alert('Please select a file first!');
      return;
    }

    // Test network speed and adjust chunk size accordingly
    this.testNetworkSpeed().then((isGoodConnection) => {
      this.chunkSize = isGoodConnection ? this.maxChunkSize : this.minChunkSize;
      console.log(`Using chunk size: ${this.chunkSize / (1024 * 1024)} MB`);

      // Start uploading in chunks
      this.currentChunk = 0;
      this.uploading = true;
      this.uploadNextChunk();
    });
  }

  private uploadNextChunk() {
    const start = this.currentChunk * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file!.size);
    const chunk = this.file!.slice(start, end); // Get the current chunk

    // Create a name for the chunk
    const chunkName = `${this.file!.name}.part${this.currentChunk}`;
    this.chunkNames.push(chunkName); // Store the chunk name

    // Log the chunk details (for debugging or visualization)
    console.log(`Chunk created: ${chunkName}`);

    // Simulate saving the chunk for testing (replace with actual backend save logic)
    const formData = new FormData();
    formData.append('file', chunk, chunkName);

    // Simulate the upload process
    setTimeout(() => {
      this.currentChunk++;

      // Update the progress percentage as a whole number
      this.progress = Math.min(100, Math.floor((end / this.file!.size) * 100)); // Whole number

      // Update the progressDecimal to show the progress
      this.progressDecimal = this.progress.toString();

      // Check if there are more chunks to upload
      if (start + this.chunkSize < this.file!.size) {
        this.uploadNextChunk(); // Upload the next chunk
      } else {
        this.uploading = false;
        alert('File uploaded successfully!');
      }
    }, 500); // Simulate a delay in uploading the chunk
  }

  // Simulate a network speed test
  private async testNetworkSpeed(): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const testChunk = new Blob(['test'], { type: 'text/plain' });

      setTimeout(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // If the test takes less than 1 second, assume a good connection
        const isGoodConnection = duration < 1000;
        resolve(isGoodConnection);
      }, 500); // Simulate a 500ms test duration
    });
  }
}
