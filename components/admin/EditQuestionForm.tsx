import QuestionEditorForm, { type EditableQuestion } from '@/components/admin/QuestionEditorForm'
import type { CategoryMap } from '@/lib/admin-dashboard'

export type { EditableQuestion }

export default function EditQuestionForm({
    question,
    categoryMap,
    returnHref,
}: {
    question: EditableQuestion
    categoryMap: CategoryMap
    returnHref?: string
}) {
    return (
        <QuestionEditorForm
            mode="edit"
            question={question}
            categoryMap={categoryMap}
            returnHref={returnHref}
        />
    )
}
