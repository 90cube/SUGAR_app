
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
                    console.log("[CloudStorage] Configuration saved to bucket: gs://sulab-app-config/v1/content.json");
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
            welcomeTitle: "서든어택 유저 전략 연구소 Su-Lab",
            loadingText: "데이터 마스터링 실행 중...",
            errorText: "피험자 식별 코드(OUID) 조회 실패",
            anomalyButtonText: "딥러닝 패턴 분석",
            searchButtonText: "전적 분석 데이터 추출"
        };
    }
}

export const cloudStorageService = new CloudStorageService();
