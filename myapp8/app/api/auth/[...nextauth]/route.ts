// app/api/auth/[...nextauth]/route.ts
//import { handlers } from "@/auth" // 경로 확인 필수
import { handlers } from "../../../auth" // 경로 확인 필수
export const { GET, POST } = handlers

