import os
import re

replacements = {
    'border-gray-200': 'border-border',
    'text-gray-500': 'text-muted-foreground',
    'text-gray-600': 'text-muted-foreground',
    'hover:bg-gray-100': 'hover:bg-accent',
    'hover:bg-gray-200': 'hover:bg-accent',
    'bg-gray-50': 'bg-muted/30'
}

files = [
    'src/components/modules-title.tsx',
    'src/components/groups/edit-group-modal.tsx',
    'src/components/groups/new-group-modal.tsx',
    'src/components/units/units-table.tsx',
    'src/components/units/members/add-unit-member-modal.tsx',
    'src/components/shared/user-list-popover.tsx',
    'src/components/units/members/members-tab.server.tsx',
    'src/components/EmailCopy.tsx',
    'src/components/calendar/CalendarClient.tsx',
    'src/components/calendar/NewEventDialog.tsx',
    'src/components/calendar/EditEventModal.tsx',
    'src/components/ui/editable-text.tsx',
    'src/app/auth/force-password/page.tsx',
    'src/app/(app)/chats/components/MessageList.tsx',
    'src/app/(app)/chats/components/MessageItem.tsx',
    'src/app/(app)/chats/components/NewMessageModal.tsx',
    'src/app/(app)/design-editor/page.tsx',
    'src/app/(app)/design-editor/editor/ActionBar.tsx',
    'src/app/(app)/design-editor/editor/actionbar/ShapeInlineBar.tsx',
    'src/app/(app)/design-editor/editor/LayersPanel.tsx',
    'src/app/(app)/design-editor/[id]/page.tsx',
    'src/app/(app)/groups/[groupId]/page.tsx',
    'src/app/(app)/calendar/page.tsx',
    'src/app/(app)/comunicados/components/SelectedRecipients.tsx',
    'src/app/(app)/comunicados/components/AnnouncementModal.tsx',
    'src/app/(app)/comunicados/components/AnnouncementDetailContent.tsx'
]

def replace_in_file(file_path):
    if not os.path.exists(file_path):
        print(f"File {file_path} not found")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        # This regex looks for the class in className="..." or cn(...)
        # It's a bit simplified but usually works for Tailwind classes.
        # We want to match it as a whole word within quotes or cn calls.
        
        # Match inside double quotes
        new_content = re.sub(rf'(".*?\b){old}(\b.*?")', rf'\1{new}\2', new_content)
        # Match inside single quotes
        new_content = re.sub(rf"('.*?\b){old}(\b.*?')", rf'\1{new}\2', new_content)
        # Match inside template literals
        new_content = re.sub(rf'(`.*?\b){old}(\b.*?`)', rf'\1{new}\2', new_content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
    else:
        print(f"No changes in {file_path}")

for file in files:
    replace_in_file(file)
