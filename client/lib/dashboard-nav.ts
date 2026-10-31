import { Activity, FolderGit2, GitPullRequest, LayoutGrid, Settings, Terminal, type LucideIcon } from "lucide-react";


export type DashboardNavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    exact?: boolean;
};

export type DashboardNavGroup = {
    label: string;
    items: DashboardNavItem[];
};

export const dashboardNavGroups: DashboardNavGroup[] = [
    {
        label: "Workspace",
        items: [
            {
                title: "Overview",
                href: "/dashboard/overview",
                icon: LayoutGrid,
            },
            {
                title: "Repositories",
                href: "/dashboard",
                icon: FolderGit2,
                exact: true,
            },
            {
                title: "PR Review",
                href: "/dashboard/review",
                icon: GitPullRequest,
            },
            {
                title: "Log Analyzer",
                href: "/dashboard/logs",
                icon: Terminal,
            },
            {
                title: "Repo Health",
                href: "/dashboard/health",
                icon: Activity,
            },
        ],
    },
    {
        label: "Account",
        items: [
            {
                title: "Settings",
                href: "/dashboard/settings",
                icon: Settings,
            },
        ],
    },
];

export function isDashboardNavActive(
    pathname: string, href: string, exact = false
){
    if(exact){
        return pathname===href;
    }
    return pathname===href || pathname.startsWith(`${href}/`);
}









