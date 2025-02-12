import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

export function ConfirmDialog({
    title,
    description,
    onConfirm,
    onCancel,
    triggerText,
}: {
    title: string
    description: React.ReactNode,
    onConfirm: () => void,
    onCancel: () => void,
    triggerText: string,
}) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                {triggerText}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
