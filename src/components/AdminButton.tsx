import { ShieldIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface AdminButtonProps {
  onClick: () => void;
}

export default function AdminButton({ onClick }: AdminButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="flex items-center space-x-2 bg-purple-500 text-white font-bold  hover:bg-purple-600 transition-colors duration-200 px-4 py-2 rounded-full"
    >
      <ShieldIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Admin</span>
    </Button>
  )
}
