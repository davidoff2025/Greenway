
import { StudyData } from '../types';

const FOLDER_NAME = 'WeeklyScriptureStudy_Data';

export class GoogleDriveService {
  private accessToken: string | null = null;

  setToken(token: string) {
    this.accessToken = token;
  }

  hasToken(): boolean {
    return this.accessToken !== null;
  }

  private async fetchWithToken(url: string, options: RequestInit = {}) {
    if (!this.accessToken) throw new Error('Not authenticated');
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  async findOrCreateFolder(): Promise<string> {
    const query = `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await this.fetchWithToken(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    const createResponse = await this.fetchWithToken(`https://www.googleapis.com/drive/v3/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const folder = await createResponse.json();
    return folder.id;
  }

  async listFiles(): Promise<{ name: string; id: string }[]> {
    const folderId = await this.findOrCreateFolder();
    const query = `'${folderId}' in parents and trashed = false`;
    const response = await this.fetchWithToken(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`);
    const data = await response.json();
    return data.files || [];
  }

  async saveStudyData(data: StudyData): Promise<void> {
    const folderId = await this.findOrCreateFolder();
    const fileName = `lesson_${data.lessonId}.json`;
    
    const query = `'${folderId}' in parents and name = '${fileName}' and trashed = false`;
    const searchRes = await this.fetchWithToken(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
    const searchData = await searchRes.json();

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    };

    const fileContent = JSON.stringify(data);
    const boundary = 'foo_bar_baz';
    const multipartBody = 
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${fileContent}\r\n` +
      `--${boundary}--`;

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      await this.fetchWithToken(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        body: fileContent,
      });
    } else {
      await this.fetchWithToken(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipartBody,
      });
    }
  }

  async loadStudyData(lessonId: number): Promise<StudyData | null> {
    const folderId = await this.findOrCreateFolder();
    const fileName = `lesson_${lessonId}.json`;
    const query = `'${folderId}' in parents and name = '${fileName}' and trashed = false`;
    
    const searchRes = await this.fetchWithToken(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      const downloadRes = await this.fetchWithToken(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
      return await downloadRes.json();
    }
    return null;
  }
}

export const driveService = new GoogleDriveService();
