import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: ["/", "/subscription", "/api/webhook"],
  
  afterAuth(auth, req, evt) {
    // Jika user tidak login dan mencoba akses protected route
    if (!auth.userId && !auth.isPublicRoute) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Jika user login tapi mencoba akses dashboard
    if (auth.userId && req.nextUrl.pathname.startsWith("/dashboard")) {
      // Check jika user memiliki role premium
      const userRole = auth.sessionClaims?.metadata?.role;
      
      if (userRole !== "premium") {
        // Redirect ke halaman subscription jika bukan premium
        return NextResponse.redirect(new URL("/subscription", req.url));
      }
    }

    // Jika user premium mencoba akses subscription page
    if (auth.userId && req.nextUrl.pathname.startsWith("/subscription")) {
      const userRole = auth.sessionClaims?.metadata?.role;
      
      if (userRole === "premium") {
        // Redirect ke dashboard jika sudah premium
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};