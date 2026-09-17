import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Skeleton della card di autenticazione (login / registrazione / reset).
 * @param {"login"|"signin"|"forgot"} [variant="login"]
 */
export const AuthPageSkeleton = ({ variant = "login", className }) => {
  const isSignIn = variant === "signin"

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black p-4",
        className
      )}
    >
      <Card className="relative w-full max-w-md overflow-hidden border-blue-500/20 bg-black/40 py-0 shadow-[0_0_40px_rgba(0,149,255,0.15)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

        <CardHeader className="relative z-10 items-center space-y-3 pb-2 pt-8">
          <Skeleton className="h-16 w-16 rounded-2xl bg-blue-500/20" />
          <Skeleton className="h-8 w-56 bg-blue-500/15" />
          <Skeleton className="h-4 w-72 max-w-full bg-blue-500/10" />
        </CardHeader>

        <CardContent className="relative z-10 space-y-5 pb-8">
          {isSignIn && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12 bg-blue-500/15" />
                <Skeleton className="h-11 w-full rounded-md bg-blue-500/10" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 bg-blue-500/15" />
                <Skeleton className="h-11 w-full rounded-md bg-blue-500/10" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Skeleton className="h-4 w-28 bg-blue-500/15" />
            <Skeleton className="h-11 w-full rounded-md bg-blue-500/10" />
          </div>

          {isSignIn && (
            <>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-blue-500/15" />
                <Skeleton className="h-11 w-full rounded-md bg-blue-500/10" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 bg-blue-500/15" />
                <Skeleton className="h-24 w-full rounded-md bg-blue-500/10" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Skeleton className="h-4 w-20 bg-blue-500/15" />
            <Skeleton className="h-11 w-full rounded-md bg-blue-500/10" />
          </div>

          {isSignIn && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 bg-blue-500/15" />
              <Skeleton className="h-11 w-full rounded-md bg-blue-500/10" />
            </div>
          )}

          {!isSignIn && variant !== "forgot" && (
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-sm bg-blue-500/20" />
              <Skeleton className="h-4 w-28 bg-blue-500/15" />
            </div>
          )}

          <Skeleton className="h-11 w-full rounded-md bg-blue-500/20" />

          <div className="flex flex-col items-center gap-2 pt-1">
            <Skeleton className="h-4 w-48 bg-blue-500/10" />
            {variant === "login" && <Skeleton className="h-4 w-40 bg-blue-500/10" />}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuthPageSkeleton
