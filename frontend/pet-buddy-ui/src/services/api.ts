// API 기본 설정 - 환경에 따른 URL 설정
import { Platform, NativeModules } from 'react-native'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - expo-constants is available in Expo runtime
import Constants from 'expo-constants'

const getApiBaseUrlCandidates = (): string[] => {
  const candidates: string[] = []
  const appendApi = (u: string) => (u.endsWith('/api') ? u : `${u.replace(/\/$/, '')}/api`)

  // 1) EXPO_PUBLIC_API_URL 우선
  const fromEnv = (process as any)?.env?.EXPO_PUBLIC_API_URL as string | undefined
  if (fromEnv) candidates.push(appendApi(fromEnv))

  // 2) Web: 현재 호스트
  if (Platform.OS === 'web') {
    const host = (globalThis as any)?.location?.hostname || 'localhost'
    candidates.push(`http://${host}:3001/api`)
  }

  // 3) Dev(Expo/RN): 번들 호스트 자동 추출
  const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL
  if (__DEV__ && scriptURL) {
    try {
      const url = new URL(scriptURL)
      const host = url.hostname || 'localhost'
      candidates.push(`http://${host}:3001/api`)
    } catch {}
  }

  // 3.5) Expo Constants에서 디버거/호스트 추출 (iOS/Android Expo Go 호환)
  try {
    const expoHostLike: string | undefined =
      (Constants as any)?.expoGoConfig?.debuggerHost ||
      (Constants as any)?.expoGoConfig?.hostUri ||
      (Constants as any)?.manifest?.debuggerHost ||
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri
    if (expoHostLike) {
      const host = String(expoHostLike).split(':')[0]
      if (host) {
        candidates.push(`http://${host}:3001/api`)
      }
    }
  } catch {}

  // 4) Android 에뮬레이터 (호스트 루프백)
  if (Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:3001/api')
  }

  // 5) 일반 로컬
  candidates.push('http://localhost:3001/api')
  candidates.push('http://127.0.0.1:3001/api')

  // 중복 제거
  return Array.from(new Set(candidates))
}

async function pingServer(base: string, timeoutMs = 3000): Promise<boolean> {
  const serverRoot = base.replace(/\/_?api$/, '') || base
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${serverRoot}/`, { 
      signal: controller.signal,
      method: 'HEAD' // HEAD 요청으로 더 빠르게 체크
    })
    return res.ok || res.status === 404 // 404도 서버가 응답하는 것으로 간주
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

let resolvedBaseUrl: string | null = null

const resolveApiBaseUrl = async (): Promise<string> => {
  if (resolvedBaseUrl) return resolvedBaseUrl
  const list = getApiBaseUrlCandidates()
  for (const candidate of list) {
    const ok = await pingServer(candidate)
    if (ok) {
      resolvedBaseUrl = candidate
      try {
        const serverRoot = candidate.replace(/\/_?api$/, '')
        ;(globalThis as any).__API_SERVER_ROOT = serverRoot
      } catch {}
      console.log(`✅ API Base URL 선택됨: ${candidate}`)
      return candidate
    }
  }
  resolvedBaseUrl = list[0]
  console.warn(`⚠️  API Base URL 자동 탐지 실패. 첫 후보 사용: ${resolvedBaseUrl}`)
  return resolvedBaseUrl
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

class ApiService {
  private baseURL: string
  private token: string | null = null

  constructor() {
    // 지연 초기화: 첫 요청 시 자동으로 API Base URL 탐지
    this.baseURL = ''
  }

  setToken(token: string) {
    this.token = token
  }

  clearToken() {
    this.token = null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (!this.baseURL) {
      this.baseURL = await resolveApiBaseUrl()
    }
    const url = `${this.baseURL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // options.headers가 있으면 안전하게 병합
    if (options.headers) {
      if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value
        })
      } else if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value
        })
      } else {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headers[key] = value
          }
        })
      }
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      console.log(`🌐 API 요청: ${options.method || 'GET'} ${url}`)
      
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()
      
      console.log(`📡 API 응답:`, data)
      
      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        }
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      }
    } catch (error) {
      console.error('❌ API 요청 오류:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.',
      }
    }
  }

  // GET 요청
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // POST 요청
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT 요청
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE 요청
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiService = new ApiService()
