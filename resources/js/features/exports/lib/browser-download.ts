export function startBrowserDownload(
    url: string,
    navigate: (downloadUrl: string) => void = (downloadUrl) =>
        window.location.assign(downloadUrl),
) {
    navigate(url);
}
