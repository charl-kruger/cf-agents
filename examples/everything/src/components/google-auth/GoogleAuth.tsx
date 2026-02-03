import { useEffect, useState } from "react";
import { Button } from "@/components/button/Button";
import { CheckCircleIcon, GoogleLogoIcon } from "@phosphor-icons/react";

export function GoogleAuth() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/auth/google/status")
      .then((res) => res.json<{ connected: boolean }>())
      .then((data) => {
        setIsConnected(data.connected);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to check google auth status", err);
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium border border-green-200 dark:border-green-800">
        <CheckCircleIcon size={16} weight="fill" />
        <span>Google Connected</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      onClick={() => {
        window.open("/auth/google", "_blank", "width=600,height=700");
      }}
    >
      <GoogleLogoIcon size={16} weight="bold" />
      <span>Connect Google</span>
    </Button>
  );
}
