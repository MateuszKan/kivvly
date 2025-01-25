import { UserIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface LoginButtonProps {
  onClick: () => void;
}

export default function LoginButton({ onClick }: LoginButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 px-4 py-2 rounded-full"
    >
      <UserIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Login</span>
    </Button>
  )
}
