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
  progress: number = 0; // Upload progress percentage
  uploading: boolean = false; // Flag to track upload status
  chunkNames: string[] = []; // Array to store chunk names
  message: { text: string; type: string } | null = null; // Message object with type
  showUploader: boolean = true; // Flag to control visibility of the uploader box

  constructor(private http: HttpClient) {}

  // Handle file selection
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.file = input.files[0];
      this.currentChunk = 0;
      this.progress = 0;
      this.uploading = false;
      this.chunkNames = []; // Reset chunk names
      this.message = null; // Reset message
      this.showUploader = true; // Ensure uploader is visible
    }
  }

  // Upload file
  uploadFile() {
    if (!this.file) {
      this.message = { text: 'Please select a file first!', type: 'error' }; // Set error message
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

  // Upload the next chunk
  private uploadNextChunk() {
    const start = this.currentChunk * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file!.size);
    const chunk = this.file!.slice(start, end); // Get the current chunk

    // Create a name for the chunk
    const chunkName = `${this.file!.name}.part${this.currentChunk}`;
    this.chunkNames.push(chunkName); // Store the chunk name

    const formData = new FormData();
    formData.append('file', chunk, chunkName);

    // Simulate the upload process
    setTimeout(() => {
      this.currentChunk++;

      // Update the progress percentage
      this.progress = Math.min(100, Math.floor((end / this.file!.size) * 100));

      // Check if there are more chunks to upload
      if (start + this.chunkSize < this.file!.size) {
        this.uploadNextChunk(); // Upload the next chunk
      } else {
        this.uploading = false;
        this.message = { text: 'File uploaded successfully!', type: 'success' }; // Set success message

        // After showing the success message, reset the uploader after 3 seconds
        setTimeout(() => {
          this.resetUploader();
        }, 1000); // Wait for 3 seconds before resetting
      }
    }, 500); // Simulate a delay in uploading the chunk
  }

  // Reset the uploader after successful upload
  private resetUploader() {
    this.file = null; // Clear the file
    this.currentChunk = 0;
    this.progress = 0;
    this.chunkNames = [];
    this.uploading = false;
    this.message = null;
    this.showUploader = true;

    // Clear the file input element manually
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Reset the file input
    }
  }

  // Simulate a network speed test to adjust chunk size
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
