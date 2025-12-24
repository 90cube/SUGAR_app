
import { PageContent } from '../types';
import { UI_STRINGS } from '../constants';

// Mock simulation of a Google Cloud Storage Bucket Service
class CloudStorageService {
    private STORAGE_KEY = 'sugar_app_content_config_v1';

    // Fetch config from "Cloud" (LocalStorage simulation)
    async fetchContentConfig(): Promise<PageContent> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const stored = localStorage.getItem(this.STORAGE_KEY);
                if (stored) {
                    try {
                        resolve(JSON.parse(stored));
                    } catch {
                        resolve(this.getDefaultContent());
                    }
                } else {
                    resolve(this.getDefaultContent());
                }
            }, 800); // Simulate network latency
        });
    }

    // Save config to "Cloud"
    async saveContentConfig(content: PageContent): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(content));
                    console.log("[CloudStorage] Configuration saved to bucket: gs://sugar-app-config/v1/content.json");
                    resolve(true);
                } catch (e) {
                    console.error("Failed to save to cloud storage", e);
                    resolve(false);
                }
            }, 1000); // Simulate network latency
        });
    }

    getDefaultContent(): PageContent {
        return {
            welcomeTitle: "서든어택 전적 & 전략 분석",
            loadingText: "데이터를 불러오는 중입니다...",
            errorText: "사용자를 찾을 수 없습니다.",
            anomalyButtonText: "이상 탐지",
            searchButtonText: "전적 검색"
        };
    }
}

export const cloudStorageService = new CloudStorageService();
