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

interface ConfirmDialogProps {
    title: string
    description: React.ReactNode,
    onConfirm: () => void,
    onCancel: () => void,
    triggerText: string,
    triggerClassName?: string,
    triggerIcon?: React.ReactNode,
}

export function ConfirmDialog({
    title,
    description,
    onConfirm,
    onCancel,
    triggerText,
    triggerClassName,
    triggerIcon
}: ConfirmDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button 
                    variant="outline"
                    className={triggerClassName}
                >
                    {triggerIcon}
                    {triggerText}
                </Button>
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
