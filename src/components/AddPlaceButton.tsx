import { PlusCircleIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface AddPlaceButtonProps {
  onClick: () => void;
}

export default function AddPlaceButton({ onClick }: AddPlaceButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="flex items-center space-x-2 bg-green-500 text-white hover:bg-green-600 transition-colors duration-200 px-4 py-2 rounded-full"
    >
      <PlusCircleIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Add Place</span>
    </Button>
  )
}
