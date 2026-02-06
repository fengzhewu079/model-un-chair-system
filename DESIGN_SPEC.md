# Design Specification Document
# Model UN Chair System

**Version**: 1.0
**Date**: 2026-01-26
**Designer**: UI/UX Designer Agent
**Status**: Ready for Development

---

## Table of Contents

1. [Design Overview](#1-design-overview)
2. [Design Principles](#2-design-principles)
3. [Information Architecture](#3-information-architecture)
4. [User Flows](#4-user-flows)
5. [Page Structures](#5-page-structures)
6. [Interaction Design](#6-interaction-design)
7. [Component Library](#7-component-library)
8. [Design System](#8-design-system)
9. [Responsive Design](#9-responsive-design)
10. [Accessibility](#10-accessibility)
11. [Implementation Notes](#11-implementation-notes)

---

## 1. Design Overview

### 1.1 Product Core Value

> Transform Chair's meeting management from "memory and experience dependent" to "rule-based process execution", where the system maintains meeting state and Chair only makes judgments and confirmations.

### 1.2 Target Users

- **Identity**: Model United Nations Conference Chairs
- **Age**: High school and college students
- **Experience**: Both novice and experienced Chairs
- **Technical Ability**: Comfortable with computers, need low-barrier tools
- **Usage Environment**: Laptop, projection display (mirrored interface), 3-4 hour sessions, 10-100+ delegates

### 1.3 Design Goals

1. **Clarity**: Information hierarchy clear, core information prioritized
2. **Efficiency**: High-frequency operations ≤ 2 clicks
3. **Learnability**: New Chairs can learn in 5 minutes without training
4. **Reliability**: Visual feedback for every operation, prevent errors
5. **Projection-ready**: Large fonts, high contrast, suitable for projection

### 1.4 Design Constraints

- **Language**: All English
- **Theme**: Light theme (white/light gray background, dark text, high contrast)
- **Interaction**: Mouse clicks + keyboard input (typing), no keyboard shortcuts
- **Interface**: Single interface for both operation and projection (mirrored)
- **10-second Alert**: Audio only (beeps 3 times), no visual alert, can be muted

---

## 2. Design Principles

### 2.1 Information Hierarchy First

- Most important: Current meeting status, current speaker, remaining time
- Important: Waiting queue, motion list
- Secondary: Operation buttons, voting area (on-demand)

### 2.2 Minimize Cognitive Load

- Chair should not need to remember information - system maintains it
- Clear labels, no ambiguous terminology
- Immediate feedback for every operation

### 2.3 Error Prevention over Error Handling

- Critical operations require confirmation (Clear queue, End meeting)
- Input validation (time > 0, required fields)
- Visual cues for incomplete actions

### 2.4 Consistency Across Interface

- Same components look and behave identically
- Consistent spacing, colors, typography
- Predictable interaction patterns

### 2.5 Projection Optimization

- Minimum font size: 16px (body), 24px (headings), 48px (critical numbers)
- High contrast ratio: 4.5:1 minimum (WCAG AA)
- Large touch targets: 48px minimum height for buttons

---

## 3. Information Architecture

### 3.1 Page Structure

```
Model UN Chair System
│
├── Setup Page (Pre-meeting)
│   ├── Step 1: Meeting Information
│   ├── Step 2: Add Delegates
│   └── Step 3: Roll Call
│
└── Main Session Page (During meeting)
    ├── Header Bar (Status + Timer + Settings)
    ├── Left Panel: Speaker Queue
    └── Right Panel: Motions & Voting
```

### 3.2 Page Relationships

```
[Setup Page]
    Step 1 → Step 2 → Step 3 (Complete Roll Call)
                         ↓
                [Auto redirect]
                         ↓
            [Main Session Page - GSL State]
                         ↓
            [Meeting flows -循环]
                ├─ Add speakers
                ├─ Record motions
                ├─ Conduct votes
                └─ Switch states
```

### 3.3 Navigation

- **Setup → Main Session**: Automatic after completing Roll Call
- **Within Main Session**: No page navigation, all in single interface
- **Settings Access**: Top-right settings icon opens settings panel
- **Update Roll Call**: Available in settings (handle late arrivals)

---

## 4. User Flows

### 4.1 Complete Setup Flow

```
1. Chair opens system
   ↓
2. Enter meeting name
   ↓
3. Set default speaking time and voting rule
   ↓ [Next]
4. Add delegates (bulk paste or individual)
   ↓ [Next]
5. Execute Roll Call (mark attendance status)
   ↓ Verify statistics
   ↓ [Complete Roll Call]
6. System locks attendance, auto-redirects to Main Session (GSL)
```

### 4.2 Add Speaker Flow

```
1. Chair clicks "Add Speaker" input box
   ↓
2. Chair types 2 letters (e.g., "US")
   ↓
3. System shows suggestion list (only present delegates)
   ↓
4. Chair clicks suggestion or presses Enter
   ↓
5. Delegate added to waiting queue
   ↓
6. Input clears, ready for next addition
```

### 4.3 Motion Processing Flow

```
1. Chair clicks "Record Motion"
   ↓
2. Modal opens with motion form
   ↓
3. Chair selects motion type and fills parameters
   ↓ [Record Motion]
4. Motion appears in motion list (Pending)
   ↓
5. Chair asks for second
   ↓
6. Chair clicks [Vote] button
   ↓
7. Voting interface appears
   ↓
8. Chair inputs vote counts
   ↓ [Calculate Result]
9. System shows result (Pass/Fail)
   ↓ [Confirm & Execute]
10. If passed: Auto-execute motion (e.g., switch to Moderated Caucus)
```

### 4.4 Speaking Flow

```
1. Waiting queue has speakers
   ↓
2. First speaker auto-becomes current speaker (or Chair clicks "Start Speaking")
   ↓
3. Timer starts automatically
   ↓
4. At 0:10, audio beeps 3 times
   ↓
5. Timer reaches 0:00
   ↓
6. Chair clicks [Next Speaker]
   ↓
7. Current speaker removed, next speaker becomes current
   ↓
8. Timer resets and starts
```

---

## 5. Page Structures

### 5.1 Setup Page Structure

#### Overall Layout

```
┌─────────────────────────────────────────────────────────┐
│  Model UN Chair System                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                    Setup Your Session                    │
│                                                          │
│  [Progress Indicator]                                   │
│  ● Meeting Info    ○ Delegates    ○ Roll Call          │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │        [Current Step Content Area]             │    │
│  │                                                 │    │
│  │                                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│                    [Back] [Next/Complete]               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Dimensions**:
- Content area max width: 800px
- Content area padding: 32px
- Content area background: White with subtle shadow
- Navigation buttons: Bottom center, 16px margin

---

#### Step 1: Meeting Information

```
Meeting Information

Meeting Name *
[_______________________________________________]

Default Speaking Time (seconds) *
[____] 60

Voting Rule *
( ) Simple Majority
(•) Absolute Majority
( ) Two-thirds Majority

                                    [Next →]
```

**Components**:
1. Page heading: "Meeting Information", 32px, bold
2. Text Input: Meeting Name (required)
3. Number Input: Default Speaking Time (required, default 60)
4. Radio Group: Voting Rule (required, default Absolute Majority)
5. Primary Button: "Next →", blue, full width or right-aligned

**Validation**:
- Meeting name cannot be empty
- Speaking time must be > 0
- Must select a voting rule

---

#### Step 2: Add Delegates

```
Add Delegates

You can paste a list (one per line) or add individually.

Bulk Input
┌─────────────────────────────────────────────────────┐
│ United States of America                            │
│ China                                               │
│ Russian Federation                                  │
│ [Paste or type delegate names here]                │
│                                                     │
└─────────────────────────────────────────────────────┘

Or add one by one:
[________________________________] [Add Delegate]

Delegates Added (15)
┌─────────────────────────────────────────────────────┐
│ 1. United States of America                    [X] │
│ 2. China                                        [X] │
│ 3. Russian Federation                           [X] │
│ 4. United Kingdom                               [X] │
│ 5. France                                       [X] │
│ ... (scrollable)                                    │
└─────────────────────────────────────────────────────┘

                         [← Back]        [Next →]
```

**Components**:
1. Textarea: Bulk input, min-height 120px, placeholder text
2. Text Input + Button: Single delegate addition
3. List: Delegates list with delete buttons, scrollable
4. Counter: "Delegates Added (15)", 18px, bold
5. Navigation: Back (secondary) + Next (primary)

**Interaction**:
- **Bulk Input**:
  - Chair pastes list, clicks outside or "Parse List" button
  - System parses each line as delegate name
  - Skips empty lines
  - Shows warning for duplicates
- **Single Add**:
  - Chair types name, presses Enter or clicks "Add Delegate"
  - Name added to list
- **Delete**: Click [X] to remove delegate
- **Validation**: Can proceed with 0 delegates, but warning shown

---

#### Step 3: Roll Call

```
Roll Call

Mark attendance status for each delegate.

Quick Actions: [Mark All Present] [Mark All Present and Voting]

┌─────────────────────────────────────────────────────────┐
│  Delegates (15)                                          │
│                                                          │
│  United States of America        [P] [PV] [A]          │
│  China                           [P] [PV] [A]          │
│  Russian Federation              [P] [PV] [A]          │
│  United Kingdom                  [P] [PV] [A]          │
│  France                          [P] [PV] [A]          │
│  ... (scrollable)                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌───────────────────────────────┐
│  Summary                      │
│  Total: 15                    │
│  Present: 12                  │
│  Present and Voting: 10       │
│  Absent: 3                    │
│  Not Marked: 0                │
└───────────────────────────────┘

                    [← Back]    [Complete Roll Call →]
```

**Components**:
1. Quick Action Buttons: Two buttons, secondary style
2. Delegate List: Scrollable, each row with name + 3 status buttons
3. Status Buttons: [P] [PV] [A], toggle style
4. Summary Card: Real-time statistics, white background with border
5. Complete Button: Primary, large

**Status Button States**:
- **Unmarked**: All buttons default style (white background, gray border)
- **Present**: [P] button highlighted (blue background, white text)
- **Present and Voting**: [PV] button highlighted (green background, white text)
- **Absent**: [A] button highlighted (gray background, white text)

**Interaction**:
- Click status button: Toggle that status for delegate
- Click different button: Switch status
- Quick Actions: Bulk set all delegates to selected status
- Complete: If unmarked delegates exist, show confirmation dialog

**Confirmation Dialog** (if unmarked delegates):
```
┌─────────────────────────────────────┐
│  Confirm Roll Call                  │
│                                     │
│  3 delegates not marked.            │
│  Continue anyway?                   │
│                                     │
│  [Cancel]    [Complete Roll Call]   │
└─────────────────────────────────────┘
```

**Success State**:
- Show success message (2 seconds): "Roll Call Completed. Total Present: 12"
- Auto-redirect to Main Session Page

---

### 5.2 Main Session Page Structure

#### Overall Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [Header Bar] - 80px height                                       │
│  Model UN Chair System                                            │
│  Current Status: General Speakers List (GSL)  [Change ▼]         │
│  Session Time: 1:30:45                        Settings [⚙]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐   │
│  │ [Left Panel - 60%]          │  │ [Right Panel - 40%]     │   │
│  │ Speaker Queue               │  │ Motions & Voting        │   │
│  │                             │  │                         │   │
│  │ [Now Speaking Card]         │  │ [Motion List]           │   │
│  │                             │  │                         │   │
│  │ [Add Speaker Input]         │  │ [Voting Area]           │   │
│  │                             │  │                         │   │
│  │ [Waiting Queue List]        │  │                         │   │
│  │                             │  │                         │   │
│  └─────────────────────────────┘  └─────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Dimensions**:
- Header Bar: 80px height, full width
- Left Panel: 60% width
- Right Panel: 40% width
- Gap between panels: 24px
- Page padding: 24px

---

#### Header Bar

```
┌──────────────────────────────────────────────────────────────┐
│  Model UN Chair System                                        │
│                                                               │
│  Current Status: General Speakers List (GSL)  [Change ▼]    │
│  Session Time: 1:30:45                    Settings [⚙]      │
└──────────────────────────────────────────────────────────────┘
```

**Components**:
1. **Product Title**: "Model UN Chair System", 20px, bold, left
2. **Status Display**:
   - Label: "Current Status:", 16px
   - Status text: 28px, bold, color varies by state
   - Optional dropdown icon for manual state change
3. **Session Timer**: "Session Time: 1:30:45", 18px, right side (optional)
4. **Settings Icon**: ⚙ icon button, 40x40px, right corner

**Status Colors**:
- GSL: Blue (#2563EB)
- Moderated Caucus: Green (#16A34A)
- Unmoderated Caucus: Orange (#EA580C)
- Voting Procedure: Purple (#9333EA)
- Suspension: Gray (#6B7280)

**Header Bar Style**:
- Background: White or light gray (#F9FAFB)
- Bottom border: 1px solid #E5E7EB
- Padding: 16px 24px

---

#### Left Panel: Speaker Queue

**Section 1: Now Speaking (Current Speaker)**

```
┌──────────────────────────────────────────────┐
│  Now Speaking                                │
│  ┌────────────────────────────────────────┐ │
│  │  🎤 United States of America           │ │
│  │                                        │ │
│  │              0:45                      │ │
│  │                                        │ │
│  │  [Pause] [Next Speaker] [End Speaking]│ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Dimensions**:
- Card height: ~220px
- Background: Light blue (#EFF6FF) or white with blue border
- Padding: 24px
- Border-radius: 8px

**Components**:
1. Section Label: "Now Speaking", 20px, bold
2. Speaker Name: 32px, bold, with icon
3. Timer Display: 72px, bold, center-aligned, monospace font
4. Button Group: Three buttons horizontal
   - [Pause]: Secondary button, gray
   - [Next Speaker]: Primary button, blue
   - [End Speaking]: Danger button, red border

**Empty State**:
- Show: "No speaker currently"
- Buttons: Disabled/grayed out

---

**Section 2: Add Speaker**

```
Add Speaker
[Type delegate name...________________]
  ▼ United States of America
    Russian Federation
```

**Dimensions**:
- Section margin-top: 24px
- Input height: 48px
- Suggestion list max-height: 200px (5 items × 40px)

**Components**:
1. Section Label: "Add Speaker", 18px, bold
2. Search Input:
   - Placeholder: "Type delegate name..."
   - Width: 100%
   - Height: 48px
   - Border: 2px, focus blue (#2563EB)
3. Suggestion List (Dropdown):
   - Background: White
   - Shadow: 0 4px 12px rgba(0,0,0,0.1)
   - Max 5 items shown
   - Each item height: 40px
   - Hover: Light blue background

**Interaction**:
- Trigger: After typing 2 letters
- Matching: Prefix or contains match, case-insensitive
- Selection: Click or Enter key
- Clear input after selection

---

**Section 3: Waiting Queue**

```
Waiting Queue (3)
┌────────────────────────────────────────┐
│ 1. China                           [X] │
│ 2. Russian Federation              [X] │
│ 3. United Kingdom                  [X] │
└────────────────────────────────────────┘
```

**Dimensions**:
- Section margin-top: 24px
- List background: White or light gray
- Border: 1px solid #E5E7EB
- Border-radius: 8px
- Min-height: 200px
- Scrollable if overflow

**Components**:
1. Section Label: "Waiting Queue (3)", 18px, bold
2. Queue List: Scrollable container
3. Queue Item:
   - Height: 48px
   - Number + Name + Delete button
   - Font: 16px
   - Hover: Light gray background (#F3F4F6)
   - Delete button: [X], 32×32px, right-aligned

**Empty State**:
- Show: "No speakers in queue"
- Center-aligned, gray text

---

#### Right Panel: Motions & Voting

**Default State (No Voting in Progress)**

```
┌──────────────────────────────────────────┐
│  Motions                                 │
│                                          │
│  [Record Motion]                         │
│                                          │
│  Active Motions (2)                      │
│  ┌────────────────────────────────────┐ │
│  │ Motion #1 - Pending                │ │
│  │ Moderated Caucus                   │ │
│  │ 10 min total, 1 min speaking       │ │
│  │ Proposed by: China                 │ │
│  │                                    │ │
│  │ [Has Second?] [Vote]               │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Motion #2 - Pending                │ │
│  │ Unmoderated Caucus                 │ │
│  │ 5 min                              │ │
│  │                                    │ │
│  │ [Has Second?] [Vote]               │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Recent Votes                            │
│  ┌────────────────────────────────────┐ │
│  │ Mod. Caucus - PASSED  15-7-3      │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Components**:

1. **Section Header**: "Motions", 20px, bold
2. **Record Button**: "Record Motion", primary button, blue, full width, 48px height
3. **Motion List Label**: "Active Motions (2)", 18px, margin-top 16px
4. **Motion Card**:
   - Background: White
   - Border: 1px solid #E5E7EB
   - Border-radius: 8px
   - Padding: 16px
   - Margin-bottom: 12px

**Motion Card Content**:
- Line 1: "Motion #1 - Pending", 14px, gray, with status badge
- Line 2: Motion type, 18px, bold (e.g., "Moderated Caucus")
- Line 3: Parameters, 14px (e.g., "10 min total, 1 min speaking")
- Line 4: Proposer (optional), 14px, italic (e.g., "Proposed by: China")
- Buttons: [Has Second?] [Vote], small secondary buttons, horizontal

**Recent Votes Section** (Optional, collapsible):
- Label: "Recent Votes", 16px
- Margin-top: 24px
- Shows last 3-5 vote results
- Compact display: Motion type + Result + Vote counts

---

**Voting State**

```
┌──────────────────────────────────────────┐
│  Voting                                  │
│                                          │
│  Motion for Moderated Caucus             │
│  10 min total, 1 min speaking            │
│                                          │
│  Voting Base: 22 delegates               │
│  Required: Simple Majority (12 votes)    │
│                                          │
│  For:      [____]  [+] [-]              │
│            15                            │
│                                          │
│  Against:  [____]  [+] [-]              │
│            7                             │
│                                          │
│  Abstain:  [____]  [+] [-]              │
│            3                             │
│                                          │
│  ─────────────────────────────           │
│  Total Votes: 25                         │
│  ⚠️ Vote count exceeds expected base    │
│                                          │
│  [Cancel Vote]  [Calculate Result]       │
│                                          │
└──────────────────────────────────────────┘
```

**Components**:

1. **Voting Header**: "Voting", 20px, bold
2. **Motion Info**: Display motion being voted on, 16px
3. **Voting Context Card**:
   - Background: Light blue (#EFF6FF)
   - Padding: 12px
   - Border-radius: 8px
   - "Voting Base: 22 delegates", 18px
   - "Required: Simple Majority (12 votes)", 18px

4. **Vote Input Group** (× 3 for For/Against/Abstain):
   - Label: "For" / "Against" / "Abstain", 16px, bold
   - Number Input: Width 80px, height 48px, font 24px
   - Button [+]: 48×48px, right of input
   - Button [-]: 48×48px, right of [+]
   - Current Value Display: Below buttons, 36px, bold
   - Margin-bottom: 16px between groups

5. **Total Display**:
   - Divider line
   - "Total Votes: 25", 24px, bold
   - Warning (if abnormal): ⚠️ icon + message, yellow/orange

6. **Action Buttons**:
   - [Cancel Vote]: Secondary button, left
   - [Calculate Result]: Primary button, blue, right
   - Horizontal layout, bottom of panel

---

**Vote Result State**

```
┌──────────────────────────────────────────┐
│  Vote Result                             │
│                                          │
│  Motion for Moderated Caucus             │
│                                          │
│          ✓ PASSED                        │
│                                          │
│  For:     15                             │
│  Against: 7                              │
│  Abstain: 3                              │
│  ─────────────                           │
│  Total:   25                             │
│                                          │
│  15 > 7 (Simple Majority)                │
│                                          │
│  [Confirm & Execute]                     │
│                                          │
└──────────────────────────────────────────┘
```

**Components**:

1. **Result Header**: "Vote Result", 20px, bold
2. **Motion Info**: Motion name, 16px
3. **Result Badge**:
   - "✓ PASSED" or "✗ FAILED"
   - 48px font, bold
   - Green (#16A34A) for passed, Red (#DC2626) for failed
   - Center-aligned
   - Margin: 24px top and bottom

4. **Vote Breakdown**:
   - For: 15
   - Against: 7
   - Abstain: 3
   - Total: 25
   - Font: 20px
   - Divider line before Total

5. **Calculation Explanation**:
   - "15 > 7 (Simple Majority)", 16px, italic, gray

6. **Confirm Button**:
   - "Confirm & Execute", primary button, blue, full width, 56px height

---

### 5.3 Modals

#### Record Motion Modal

```
┌─────────────────────────────────────────────┐
│  Record Motion                          [X] │
│                                             │
│  Motion Type *                              │
│  [Dropdown ▼]                               │
│  ▼ Motion for Moderated Caucus              │
│    Motion for Unmoderated Caucus            │
│    Motion to Close Debate                   │
│    Motion to Suspend Meeting                │
│    Motion to Adjourn Meeting                │
│                                             │
│  Proposer (optional)                        │
│  [_________________________]                │
│                                             │
│  [Dynamic fields based on motion type]      │
│                                             │
│  For Moderated Caucus:                      │
│    Total Time (minutes) *                   │
│    [____] 10                                │
│                                             │
│    Speaking Time (seconds) *                │
│    [____] 60                                │
│                                             │
│    Topic (optional)                         │
│    [_________________________]              │
│                                             │
│                                             │
│          [Cancel]    [Record Motion]        │
└─────────────────────────────────────────────┘
```

**Modal Specifications**:
- Max width: 600px
- Background: White
- Border-radius: 12px
- Padding: 24px
- Shadow: 0 8px 24px rgba(0,0,0,0.15)
- Backdrop: rgba(0,0,0,0.5)
- Center-aligned

**Components**:
1. Header: "Record Motion" + Close button [X], 24px bold
2. Motion Type Dropdown: Required field
3. Proposer Input: Optional text input
4. Dynamic Fields: Shown based on selected motion type
5. Footer Buttons: Cancel (secondary) + Record (primary)

**Dynamic Fields by Motion Type**:

- **Moderated Caucus**: Total time, Speaking time, Topic
- **Unmoderated Caucus**: Time
- **Close Debate**: No additional fields
- **Suspend Meeting**: Time (optional)
- **Adjourn Meeting**: No additional fields

**Validation**:
- Motion type required
- Time fields must be > 0
- Show error message if validation fails: "Please fill in required fields"

---

#### Confirmation Dialog

```
┌─────────────────────────────────────┐
│  Confirm Action                     │
│                                     │
│  [Message text]                     │
│                                     │
│  [Cancel]         [Confirm]         │
└─────────────────────────────────────┘
```

**Used for**:
- Complete Roll Call with unmarked delegates
- Switch state during active speech
- Cancel vote in progress
- Clear speaker queue

**Specifications**:
- Max width: 400px
- Padding: 24px
- Message: 16px, center-aligned
- Buttons: Equal width, horizontal

---

## 6. Interaction Design

### 6.1 Button Interactions

**States**:
- **Default**: Base styling
- **Hover**: Background darkens/lightens, cursor: pointer
- **Active**: Slight press effect (translateY: 1px)
- **Focus**: Blue outline (for keyboard navigation)
- **Disabled**: Opacity: 0.5, cursor: not-allowed

**Timing**:
- Hover transition: 150ms ease
- Active transition: 100ms ease

---

### 6.2 Input Interactions

**Text Input / Textarea**:
- **Default**: Gray border (#D1D5DB)
- **Focus**: Blue border (#2563EB, 2px), outer glow
- **Error**: Red border (#DC2626), error message below
- **Disabled**: Gray background (#F3F4F6), not editable

**Number Input**:
- Allow direct typing
- Optional +/- buttons
- Prevent negative values (auto-correct to 0)
- Validate > 0 for time fields

---

### 6.3 Search Input with Suggestions

**Interaction Flow**:

1. **Initial**: Input box, placeholder visible
2. **Focus**: Border turns blue
3. **Type 1 letter**: No suggestions yet
4. **Type 2 letters**: Trigger search, show dropdown
5. **Dropdown appears**:
   - Position: Below input
   - Max 5 items
   - First item highlighted
   - Smooth fade-in animation (150ms)
6. **Navigation**:
   - Mouse: Hover changes highlight
   - Keyboard: Arrow keys move highlight (optional for MVP)
   - Click or Enter: Select highlighted item
7. **Selection**: Dropdown closes, input clears, item added to list
8. **No matches**: Show "No matches found. Press Enter to add anyway."

**Suggestion Item**:
- Height: 40px
- Padding: 8px 12px
- Font: 16px
- Hover: Light blue background (#EFF6FF)
- Active/Highlighted: Darker blue background (#DBEAFE)

---

### 6.4 Timer Behavior

**States**:

1. **Normal** (> 0:10):
   - Display: "M:SS" format (e.g., "1:30", "0:45")
   - Color: Default (#111827)
   - Update: Every second

2. **10-Second Alert** (= 0:10):
   - Trigger: Audio beeps 3 times (beep-beep-beep)
   - Visual: No change (color remains default)
   - Audio: Can be muted globally

3. **Countdown Continues** (0:09 → 0:01):
   - Display: Continues counting
   - Color: Default (no visual alert)
   - Audio: No additional sounds

4. **Time Up** (= 0:00):
   - Display: "0:00"
   - Color: Optional red or flash (to indicate time up)
   - Audio: Optional additional beep (different from 10-sec alert)
   - Action: Chair must manually click [Next] or [End Speaking]

5. **Overtime** (< 0:00):
   - Display: "-0:01", "-0:02"... OR "0:00 (overtime)"
   - Color: Red (#DC2626)
   - Chair can let delegate continue or manually end

6. **Paused**:
   - Display: Shows current time (e.g., "0:45")
   - Label: "Paused" appears
   - Timer stops
   - Button: [Pause] changes to [Resume]

**Controls**:
- [Pause] / [Resume]: Toggle pause state
- [Reset]: Reset to initial time, stop timer
- [+30s]: Add 30 seconds to current time
- Manual end: [Next Speaker] or [End Speaking]

---

### 6.5 State Transitions

**Meeting State Transitions**:

```
GSL → Moderated Caucus (via passed motion)
GSL → Unmoderated Caucus (via passed motion)
GSL → Voting Procedure (manual or via motion)
GSL → Suspension (via passed motion)

Moderated Caucus → GSL (time expires or manual end)
Unmoderated Caucus → GSL (time expires or manual end)
Voting Procedure → GSL (vote complete)
Suspension → GSL (resume meeting)
```

**Transition Feedback**:
- Status bar text updates immediately
- Status color changes
- Optional: Brief animation or transition effect (fade, slide)
- Layout adjusts (e.g., hide speaker queue in Unmoderated)
- Timestamp recorded automatically

---

### 6.6 Error Handling

**Input Validation Errors**:

| Scenario | Error Message | Action |
|----------|--------------|--------|
| Empty required field | "This field is required" | Red border, message below |
| Time value = 0 or negative | "Time must be greater than 0" | Red border, message below |
| Invalid number | "Please enter a valid number" | Red border, message below |
| Duplicate delegate name | "This delegate already exists" | Warning message, don't add |

**Operation Warnings**:

| Scenario | Warning Message | User Action |
|----------|----------------|-------------|
| Unmarked delegates in Roll Call | "3 delegates not marked. Continue anyway?" | Cancel or Continue |
| Vote count abnormal | "⚠️ Vote count exceeds expected base. Please verify." | Verify or proceed |
| End speech with queue | "End current speech and switch state?" | Cancel or Confirm |

**System Errors**:
- Data save failed: "Failed to save. Please try again."
- Browser crashed: "Resume previous session?" on next open

---

## 7. Component Library

### 7.1 Buttons

#### Primary Button

**Usage**: Main actions (Next, Complete, Confirm)

**Specifications**:
- Background: #2563EB (Primary Blue)
- Text: White (#FFFFFF)
- Font: 16px, semi-bold
- Height: 48px
- Min-width: 120px
- Padding: 0 16px
- Border-radius: 8px
- Border: None

**States**:
- Hover: Background #1E40AF
- Active: Background #1E3A8A, translateY(1px)
- Disabled: Opacity 0.5

**CSS Example**:
```css
.button-primary {
  background: #2563EB;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  height: 48px;
  min-width: 120px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 150ms ease;
}

.button-primary:hover {
  background: #1E40AF;
}

.button-primary:active {
  background: #1E3A8A;
  transform: translateY(1px);
}

.button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

#### Secondary Button

**Usage**: Back, Cancel, secondary actions

**Specifications**:
- Background: White (#FFFFFF)
- Border: 2px solid #D1D5DB
- Text: #374151 (Gray 700)
- Other dimensions: Same as Primary

**States**:
- Hover: Background #F3F4F6
- Active: Background #E5E7EB

---

#### Danger Button

**Usage**: Delete, End, destructive actions

**Specifications**:
- Background: White (#FFFFFF)
- Border: 2px solid #DC2626
- Text: #DC2626 (Red)
- Other dimensions: Same as Primary

**States**:
- Hover: Background #FEF2F2
- Active: Background #FEE2E2

---

#### Icon Button

**Usage**: Delete [X], Settings ⚙

**Specifications**:
- Size: 40×40px (standard), 32×32px (small)
- Background: Transparent or White
- Border-radius: 8px
- Icon size: 20×20px

**States**:
- Hover: Background #F3F4F6

---

### 7.2 Inputs

#### Text Input

**Specifications**:
- Height: 48px
- Border: 1px solid #D1D5DB
- Border-radius: 8px
- Padding: 12px
- Font: 16px
- Placeholder: #9CA3AF (Gray 400)

**States**:
- Focus: Border 2px solid #2563EB, outer glow
- Error: Border 2px solid #DC2626
- Disabled: Background #F3F4F6

**CSS Example**:
```css
.input-text {
  height: 48px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  padding: 12px;
  font-size: 16px;
  width: 100%;
  transition: border 150ms ease;
}

.input-text:focus {
  outline: none;
  border: 2px solid #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.input-text.error {
  border: 2px solid #DC2626;
}

.input-text::placeholder {
  color: #9CA3AF;
}
```

---

#### Number Input

**Specifications**:
- Same as Text Input
- Additional: +/- buttons optional
- Type: number
- Min: 0 for most fields

---

#### Textarea

**Specifications**:
- Min-height: 120px
- Border: 1px solid #D1D5DB
- Border-radius: 8px
- Padding: 12px
- Font: 16px
- Resize: vertical

---

#### Search Input

**Specifications**:
- Same as Text Input
- Icon: Search icon (left side, optional)
- Dropdown: Appears below on trigger

**Dropdown Specifications**:
- Background: White
- Border: 1px solid #E5E7EB
- Border-radius: 8px
- Shadow: 0 4px 12px rgba(0,0,0,0.1)
- Max-height: 200px (5 items)
- Scrollable if needed

---

### 7.3 Dropdown / Select

**Specifications**:
- Height: 48px
- Border: 1px solid #D1D5DB
- Border-radius: 8px
- Padding: 12px
- Font: 16px
- Dropdown arrow: Right side

**Dropdown List**:
- Background: White
- Each item height: 40px
- Hover: #EFF6FF
- Selected: #DBEAFE

---

### 7.4 Cards

#### Default Card

**Specifications**:
- Background: White
- Border: 1px solid #E5E7EB (optional)
- Border-radius: 8px
- Padding: 16px-24px
- Shadow: None or subtle

**CSS Example**:
```css
.card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 24px;
}
```

---

#### Highlight Card

**Usage**: Current speaker card

**Specifications**:
- Background: #EFF6FF (Light blue)
- Border: 2px solid #2563EB (optional)
- Border-radius: 8px
- Padding: 24px

---

#### Warning Card

**Usage**: Warnings, alerts

**Specifications**:
- Background: #FFFBEB (Light yellow)
- Border: 1px solid #F59E0B
- Border-radius: 8px
- Padding: 16px
- Icon: ⚠️ (warning icon)

---

### 7.5 Lists

#### Simple List

**Specifications**:
- Background: White or #F9FAFB
- Border: 1px solid #E5E7EB
- Border-radius: 8px

**List Item**:
- Height: 48px
- Padding: 12px
- Border-bottom: 1px solid #E5E7EB (except last)
- Hover: Background #F3F4F6

---

#### Action List

**Usage**: Waiting queue, delegate list

**List Item**:
- Height: 48px
- Content: Number/Text + Action buttons
- Delete button [X]: Right-aligned, 32×32px

---

### 7.6 Modal

**Specifications**:
- Backdrop: rgba(0,0,0,0.5)
- Modal background: White
- Max-width: 600px (default), 400px (confirmation)
- Border-radius: 12px
- Padding: 24px
- Shadow: 0 8px 24px rgba(0,0,0,0.15)
- Position: Center of screen

**Structure**:
- Header: Title (24px, bold) + Close button [X]
- Body: Content area, scrollable if needed
- Footer: Action buttons (horizontal)

**Animation**: Fade in + scale (200ms ease-out)

---

### 7.7 Timer Display

**Specifications**:
- Font: "Roboto Mono", monospace
- Size: 72px (large), 36px (medium), 24px (small)
- Weight: Bold
- Color: #111827 (default), #DC2626 (overtime)
- Format: "M:SS" (e.g., "1:30", "0:05")

**CSS Example**:
```css
.timer-large {
  font-family: "Roboto Mono", monospace;
  font-size: 72px;
  font-weight: 700;
  color: #111827;
}

.timer-overtime {
  color: #DC2626;
}
```

---

### 7.8 Badge / Tag

**Usage**: Status labels (Pending, Passed, Failed)

**Specifications**:
- Height: 24px
- Padding: 8px horizontal
- Border-radius: 12px (pill shape)
- Font: 12px, bold, uppercase
- Colors: Based on status

**Status Colors**:
- Pending: Background #FFFBEB, Text #F59E0B
- In Voting: Background #EFF6FF, Text #2563EB
- Passed: Background #F0FDF4, Text #16A34A
- Failed: Background #FEF2F2, Text #DC2626

---

### 7.9 Progress Indicator

**Usage**: Setup page step indicator

**Specifications**:
- Circle size: 16px diameter
- Active: Filled, #2563EB
- Inactive: Outlined, #D1D5DB
- Complete: Checkmark, #16A34A
- Connection line: 1px dashed #D1D5DB

---

## 8. Design System

### 8.1 Color Palette

#### Primary Colors
```
Primary Blue: #2563EB
Primary Blue Hover: #1E40AF
Primary Blue Light: #EFF6FF (backgrounds)
```

#### Functional Colors
```
Success Green: #16A34A
Success Light: #F0FDF4

Error Red: #DC2626
Error Light: #FEF2F2

Warning Yellow: #F59E0B
Warning Light: #FFFBEB

Info Blue: #0284C7
Info Light: #F0F9FF
```

#### Neutral Colors
```
Gray 900: #111827 (headings)
Gray 700: #374151 (body text)
Gray 500: #6B7280 (secondary text)
Gray 300: #D1D5DB (borders)
Gray 100: #F3F4F6 (backgrounds)
Gray 50: #F9FAFB (card backgrounds)
White: #FFFFFF
```

#### State Colors
```
GSL: #2563EB (Blue)
Moderated: #16A34A (Green)
Unmoderated: #EA580C (Orange)
Voting: #9333EA (Purple)
Suspension: #6B7280 (Gray)
```

---

### 8.2 Typography

#### Font Families
```css
Primary: "Inter", system-ui, sans-serif
Monospace: "Roboto Mono", monospace
```

#### Font Sizes
```
Heading 1: 32px, bold (page titles)
Heading 2: 24px, bold (section titles)
Heading 3: 20px, semi-bold (subsection titles)
Heading 4: 18px, semi-bold
Body Large: 18px (important info)
Body: 16px (default text)
Body Small: 14px (secondary info)
Caption: 12px (labels, hints)

Timer Large: 72px, bold
Timer Medium: 36px, bold
```

#### Line Heights
```
Headings: 1.2
Body: 1.5
Buttons: 1
```

#### Font Weights
```
Regular: 400
Semi-bold: 600
Bold: 700
```

---

### 8.3 Spacing System

**Base Unit**: 8px

```
XS: 8px
S: 16px
M: 24px
L: 32px
XL: 48px
XXL: 64px
```

**Usage**:
- Component padding: S (16px)
- Component margin: M (24px)
- Section margin: L (32px)
- Page padding: M-L (24-32px)

---

### 8.4 Border Radius

```
Small: 4px (badges)
Default: 8px (buttons, inputs, cards)
Large: 12px (modals)
Pill: 999px (badges, tags)
```

---

### 8.5 Shadows

```css
/* Small - hover effects */
shadow-sm: 0 1px 2px rgba(0,0,0,0.05);

/* Medium - cards */
shadow-md: 0 4px 6px rgba(0,0,0,0.1);

/* Large - modals, dropdowns */
shadow-lg: 0 8px 24px rgba(0,0,0,0.15);

/* Focus - input focus */
shadow-focus: 0 0 0 3px rgba(37, 99, 235, 0.1);
```

---

### 8.6 Breakpoints

**Minimum Support**: 1366x768

**Recommended**: 1920x1080

**Responsive Approach**:
- Fixed desktop layout for MVP
- No mobile support needed
- Ensure readability at 1366x768

---

## 9. Responsive Design

### 9.1 Minimum Resolution: 1366x768

**Layout Adjustments**:
- Left Panel: 55% width (reduced from 60%)
- Right Panel: 45% width (increased from 40%)
- Font sizes: Minimum maintained (16px body, 24px headings)
- Padding: Reduced to 16px on smaller screens

---

### 9.2 Recommended Resolution: 1920x1080

**Layout**:
- Standard 60/40 split
- Full padding and spacing
- Optimal readability

---

### 9.3 Projection Considerations

- All text minimum 16px
- Critical info minimum 24px
- Timer displays: 72px (current speaker), 36px (session)
- High contrast: 4.5:1 minimum
- No thin fonts

---

## 10. Accessibility

### 10.1 Color Contrast

- All text meets WCAG AA standard (4.5:1 for normal text, 3:1 for large text)
- Status colors distinguishable by color-blind users
- Don't rely solely on color (use icons, labels)

### 10.2 Keyboard Navigation

**Essential for MVP**:
- Tab navigation through interactive elements
- Enter to activate buttons
- Escape to close modals

**Not Required for MVP**:
- Complex keyboard shortcuts
- Arrow key navigation in lists

### 10.3 Focus States

- Visible focus outline on all interactive elements
- Blue outline: 2px solid #2563EB

### 10.4 Touch Targets

- Minimum 40×40px
- Recommended 48×48px
- Adequate spacing between targets (8px minimum)

### 10.5 Screen Readers

**For Future Enhancement**:
- Semantic HTML
- ARIA labels where needed
- Alt text for icons

---

## 11. Implementation Notes

### 11.1 Technology Recommendations

**Frontend Framework**:
- React or Vue 3 (component-based, clear state management)

**State Management**:
- Zustand or Pinia (lightweight, easy to use)

**UI Component Library**:
- Ant Design or Element Plus (or build custom based on this spec)

**Data Persistence**:
- LocalStorage (simple, reliable)
- IndexedDB for larger data (optional)

**Audio**:
- Web Audio API or Howler.js
- Preload beep sound file

---

### 11.2 Component Implementation Priority

**Phase 1 (P0)**:
1. Button component (all variants)
2. Input components (text, number, search)
3. Card component
4. Modal component
5. List component

**Phase 2 (P1)**:
6. Timer display component
7. Dropdown component
8. Badge component
9. Progress indicator

---

### 11.3 Data Structure

```typescript
// Delegate (for Roll Call)
interface Delegate {
  id: string;
  name: string;
  attendance: 'present' | 'present_and_voting' | 'absent';
  timestamp: Date;
}

// Roll Call Result
interface RollCallResult {
  delegates: Delegate[];
  totalDelegates: number;
  presentCount: number;
  presentAndVotingCount: number;
  absentCount: number;
  completed: boolean;
  completedAt?: Date;
}

// Meeting State
interface MeetingState {
  id: string;
  name: string;
  status: 'setup' | 'roll_call' | 'GSL' | 'Moderated' | 'Unmoderated' | 'Voting' | 'Suspension';
  startTime: Date;
  rollCall: RollCallResult;
  defaultSpeakingTime: number; // seconds
  votingRule: 'simple' | 'absolute' | 'two_thirds';
}

// Speaker
interface Speaker {
  id: string;
  name: string;
  status: 'speaking' | 'waiting';
  speakingTime: number;
  remainingTime: number;
}

// Motion
interface Motion {
  id: string;
  type: string;
  proposer?: string;
  parameters: Record<string, any>;
  status: 'pending' | 'in_voting' | 'passed' | 'failed';
  voteResult?: VoteResult;
  timestamp: Date;
}

// Vote Result
interface VoteResult {
  for: number;
  against: number;
  abstain: number;
  total: number;
  votingBase: number;
  result: 'pass' | 'fail';
  rule: string;
  timestamp: Date;
}
```

---

### 11.4 Audio Implementation

**10-Second Alert**:
- Sound file: `beep-3x.mp3` or `beep-3x.wav`
- Duration: ~0.5 seconds (3 quick beeps)
- Volume: Adjustable, default 70%
- Trigger: When timer reaches 0:10

**Implementation**:
```javascript
// Preload audio
const alertSound = new Audio('/sounds/beep-3x.mp3');
alertSound.volume = 0.7;

// Play when timer = 10 seconds
if (remainingTime === 10 && !alertPlayed) {
  if (!isMuted) {
    alertSound.play();
  }
  setAlertPlayed(true);
}
```

**Mute Control**:
- Global setting in settings panel
- Persisted to LocalStorage
- Icon: 🔊 (unmuted) / 🔇 (muted)

---

### 11.5 State Persistence

**LocalStorage Keys**:
```javascript
'mun-chair-current-session': Current meeting state
'mun-chair-settings': User settings (mute, etc.)
'mun-chair-history': Recent votes, motions (optional)
```

**Auto-save Triggers**:
- Every state change
- Every 30 seconds (auto-save interval)
- Before browser close (beforeunload event)

**Recovery**:
- On load, check if session exists
- Show "Resume previous session?" if found
- Load from LocalStorage if user confirms

---

### 11.6 Performance Considerations

**Optimization**:
- Debounce search input (300ms)
- Virtualize long lists (if > 50 items)
- Lazy load modals
- Memoize computed values (vote calculations)

**Timer Accuracy**:
- Use `setInterval` with 100ms or `requestAnimationFrame`
- Prevent drift by tracking actual elapsed time
- Don't rely on pure 1-second intervals

---

### 11.7 Error Boundaries

**Implement error boundaries** to catch React errors:
- Show friendly error message
- Offer "Reload" button
- Log error for debugging
- Don't lose user data (save before error if possible)

---

### 11.8 Browser Compatibility

**Target Browsers**:
- Chrome 90+
- Edge 90+
- Safari 14+
- Firefox 88+

**Required Features**:
- LocalStorage
- Web Audio API
- Flexbox/Grid
- ES6+

---

## 12. Design Checklist

### 12.1 Before Development

- [ ] All page structures defined
- [ ] All components specified
- [ ] All interactions documented
- [ ] Color palette finalized
- [ ] Typography system defined
- [ ] Spacing system defined
- [ ] Data structures defined

### 12.2 During Development

- [ ] Components match specifications
- [ ] Colors use design tokens
- [ ] Spacing follows 8px system
- [ ] Fonts are correct sizes/weights
- [ ] Interactions feel responsive
- [ ] Audio works correctly
- [ ] State persists correctly

### 12.3 Before Handoff

- [ ] All MVP features implemented
- [ ] Tested at 1366x768 and 1920x1080
- [ ] Tested with real delegate names
- [ ] Tested full user flow (Setup → Session → Motion → Vote)
- [ ] Audio alert tested
- [ ] LocalStorage tested
- [ ] Error states tested
- [ ] Loading states tested

---

## 13. Design Sign-off

### 13.1 Design Completeness

✅ **Complete**: This design specification covers all MVP requirements from PRD v1.1:
- Roll Call module fully designed
- Intelligent search with suggestions fully designed
- Voting with automatic calculation fully designed
- All page structures defined
- All interaction flows documented
- All components specified

### 13.2 PRD Coverage

All PRD requirements mapped to design:

| PRD Feature | Design Section | Status |
|-------------|----------------|--------|
| Roll Call | 5.1 Step 3, 6.1 | ✅ |
| Intelligent Search | 5.2 Section 2, 6.3 | ✅ |
| Speaker Queue | 5.2 Left Panel | ✅ |
| Meeting States | 5.2 Header Bar | ✅ |
| Motion Processing | 5.2 Right Panel, 5.3 Modal | ✅ |
| Voting Management | 5.2 Right Panel (Voting State) | ✅ |
| Timer with 10-sec Alert | 5.2 Left Panel, 6.4 | ✅ |
| Settings | 5.2 Header Bar | ✅ |

### 13.3 Readiness for Development

✅ **Ready**: This specification provides:
- Clear page structures
- Detailed component specifications
- Complete interaction flows
- Comprehensive design system
- Implementation notes

Development can begin immediately using this specification.

### 13.4 Open Questions

None - all design decisions finalized based on confirmed requirements.

---

## 14. Appendix

### 14.1 Design Assets Needed

**Fonts**:
- Inter (Google Fonts)
- Roboto Mono (Google Fonts)

**Icons**:
- Microphone icon (🎤)
- Settings icon (⚙)
- Close icon (✕)
- Dropdown arrow (▼)
- Plus/Minus (+/-)
- Checkmark (✓)
- Warning (⚠️)

**Audio**:
- beep-3x.mp3 (10-second alert)

### 14.2 Design Tools

Recommended for high-fidelity mockups (if needed):
- Figma
- Adobe XD
- Sketch

---

## 15. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-26 | Initial complete design specification | UI/UX Designer Agent |

---

## Document End

This design specification is ready for development implementation.

**Next Step**: Summon Developer Agent with command `/开发`
