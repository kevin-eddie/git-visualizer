"use client"
import React from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { NavigationMenuContent, NavigationMenuLink, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"
import { NavigationMenuItem } from "@/components/ui/navigation-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function SignInNavigationMenuItem() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

    return (
        <>
        {
            loading ? (
                <NavigationMenuItem>
                    <span className={navigationMenuTriggerStyle()}>Loading...</span>
                </NavigationMenuItem>
            ):(
                session ? (
                    <NavigationMenuItem>
                        <NavigationMenuTrigger>
                            <Avatar>
                                <AvatarImage src={session.user?.image ?? ""} />
                                <AvatarFallback>{session.user?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                        <ul className="grid gap-3 p-6 md:w-[100px] lg:w-[120px]">
                            <li>
                                <button
                                    onClick={() => signOut()}
                                    className={navigationMenuTriggerStyle() + " cursor-pointer"}
                                >
                                    Sign Out
                                </button>
                            </li>
                        </ul>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                ):(
                    <button
                        onClick={() => signIn("github")}
                        className={navigationMenuTriggerStyle() + " cursor-pointer"}
                    >
                        Sign in with GitHub
                    </button>
                )
            )
        }
        </>
    //     <NavigationMenuItem>
    //     {loading ? (
    //       <span className={navigationMenuTriggerStyle()}>Loading...</span>
    //     ) : session ? (
    //       <div className="flex items-center gap-2">
    //         <span className="text-sm font-medium pl-4 flex items-center gap-2">
    //             <Avatar>
    //                 <AvatarImage src={session.user?.image ?? ""} />
    //                 <AvatarFallback>{session.user?.name?.charAt(0)}</AvatarFallback>
    //             </Avatar>
    //             {session.user?.name}
    //         </span>
    //       </div>
    //     ) : (
    //     )
    // }
    //   </NavigationMenuItem>
    )
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"

