import { redirect } from "next/navigation"

/** 根路由重定向到首页 */
export default function RootPage() {
  redirect("/home")
}
