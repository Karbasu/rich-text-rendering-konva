# Rich Text Editor - Visual Diagrams

These diagrams use Mermaid syntax and will render automatically on GitHub.

---

## System Architecture

```mermaid
graph TB
    subgraph "User Interface"
        UI[React App]
        TB[Toolbar]
        ST[Konva Stage]
    end

    subgraph "Konva Layer"
        RTN[RichTextNode]
        TF[Transformer]
    end

    subgraph "Core Engine"
        TY[Types]
        DM[Document Model]
        LE[Layout Engine]
        RD[Renderer]
    end

    UI --> TB
    UI --> ST
    ST --> RTN
    ST --> TF

    TB --> RTN
    TF --> RTN

    RTN --> DM
    DM --> LE
    LE --> RD
    RD --> RTN

    classDef ui fill:#e1f5fe
    classDef konva fill:#fff3e0
    classDef engine fill:#f3e5f5

    class UI,TB,ST ui
    class RTN,TF konva
    class TY,DM,LE,RD engine
```

---

## Data Flow

```mermaid
flowchart LR
    A[User Input] --> B[RichTextNode]
    B --> C[Document Model]
    C --> D[Layout Engine]
    D --> E[Renderer]
    E --> F[Canvas Image]
    F --> G[Display]

    C -.-> H[History Stack]
    H -.-> C

    style A fill:#ffeb3b
    style F fill:#4caf50
    style G fill:#4caf50
```

---

## Document Structure

```mermaid
classDiagram
    class RichTextDocument {
        +TextSpan[] spans
        +TextAlign align
        +VerticalAlign verticalAlign
        +number padding
        +Map~number,ListItem~ listItems
    }

    class TextSpan {
        +string id
        +string text
        +TextStyle style
    }

    class TextStyle {
        +string fontFamily
        +number fontSize
        +string|number fontWeight
        +string fontStyle
        +string color
        +boolean underline
        +boolean strikethrough
        +number letterSpacing
        +number lineHeight
        +string backgroundColor
        +Shadow shadow
        +Stroke stroke
    }

    class ListItem {
        +ListType type
        +number level
        +number index
    }

    class Selection {
        +number anchor
        +number focus
    }

    RichTextDocument "1" *-- "*" TextSpan
    RichTextDocument "1" *-- "*" ListItem
    TextSpan "1" *-- "1" TextStyle
```

---

## Layout Pipeline

```mermaid
flowchart TD
    A[RichTextDocument] --> B[Flatten to Characters]
    B --> C[Tokenize]
    C --> D{Token Type}

    D -->|Word| E[Add to Current Line]
    D -->|Whitespace| F[Add Space]
    D -->|Newline| G[Finalize Line]

    E --> H{Fits in Line?}
    H -->|Yes| I[Continue]
    H -->|No| J[Wrap to New Line]

    F --> I
    G --> K[Increment Line Index]
    J --> I
    K --> I

    I --> L{More Tokens?}
    L -->|Yes| D
    L -->|No| M[Apply Alignment]

    M --> N[Apply Vertical Position]
    N --> O[LayoutResult]

    style A fill:#e3f2fd
    style O fill:#c8e6c9
```

---

## Enter Key State Machine

```mermaid
stateDiagram-v2
    [*] --> CheckListItem : Press Enter

    CheckListItem --> EmptyCheck : Is List Item
    CheckListItem --> SplitParagraph : Not List Item

    EmptyCheck --> ExitList : Line Empty
    EmptyCheck --> PositionCheck : Line Has Content

    PositionCheck --> CreateAbove : At Line Start
    PositionCheck --> SplitList : Middle/End of Line

    ExitList --> [*] : Remove List Formatting
    CreateAbove --> [*] : New Empty Item Above
    SplitList --> [*] : Two List Items
    SplitParagraph --> [*] : Two Paragraphs
```

---

## Backspace Key State Machine

```mermaid
stateDiagram-v2
    [*] --> CheckSelection : Press Backspace

    CheckSelection --> DeleteSelection : Has Selection
    CheckSelection --> CheckPosition : No Selection

    CheckPosition --> ListStart : At List Item Start
    CheckPosition --> CheckNewline : Not at Start

    ListStart --> Outdent : Level > 0
    ListStart --> RemoveList : Level = 0

    CheckNewline --> MergeLines : Deleting Newline
    CheckNewline --> DeleteChar : Regular Character

    DeleteSelection --> Renumber
    Outdent --> Renumber
    RemoveList --> Renumber
    MergeLines --> Renumber
    DeleteChar --> [*]

    Renumber --> [*]
```

---

## List Nesting

```mermaid
graph LR
    subgraph "Bullet List Styles"
        B0[● Level 0]
        B1[○ Level 1]
        B2[■ Level 2]
    end

    subgraph "Number List Styles"
        N0[1. 2. 3. Level 0]
        N1[a. b. c. Level 1]
        N2[i. ii. iii. Level 2]
    end

    B0 --> B1
    B1 --> B2
    B2 -.->|cycles| B0

    N0 --> N1
    N1 --> N2
    N2 -.->|cycles| N0
```

---

## Rendering Order

```mermaid
sequenceDiagram
    participant C as Canvas Context
    participant S as Selection
    participant L as List Markers
    participant T as Text Characters
    participant D as Decorations
    participant R as Caret

    C->>C: Clear Background
    C->>S: Draw Selection Highlights
    C->>L: Draw Bullets/Numbers
    C->>T: Draw Character Fill
    C->>D: Draw Underline/Strike
    C->>R: Draw Caret (if editing)
```

---

## Event Handling Flow

```mermaid
flowchart TD
    subgraph "Keyboard Events"
        KD[keydown] --> KH{Key Handler}
        KH -->|Ctrl+B| TB[Toggle Bold]
        KH -->|Ctrl+I| TI[Toggle Italic]
        KH -->|Ctrl+Z| UN[Undo]
        KH -->|Enter| EN[Handle Enter]
        KH -->|Tab| TAB[Handle Tab]
        KH -->|Backspace| BS[Handle Backspace]
        KH -->|Arrow| MV[Move Caret]
    end

    subgraph "Mouse Events"
        CL[click] --> HT[Hit Test]
        DC[dblclick] --> BZ{Bullet Zone?}
        BZ -->|Yes| EL[Exit List]
        BZ -->|No| SW[Select Word]
        MD[mousedown] --> SS[Start Selection]
        MU[mouseup] --> ES[End Selection]
    end

    TB --> UL[Update Layout]
    TI --> UL
    EN --> UL
    TAB --> UL
    BS --> UL
    EL --> UL

    UL --> RN[Render]
    RN --> PH[Push History]

    style UL fill:#fff9c4
    style RN fill:#c8e6c9
```

---

## History Management

```mermaid
sequenceDiagram
    participant U as User
    participant N as RichTextNode
    participant H as History Stack
    participant D as Document

    U->>N: Type Character
    N->>D: Insert Text
    N->>H: Push State
    Note over H: [State1, State2, State3*]

    U->>N: Ctrl+Z (Undo)
    N->>H: Get Previous
    H->>D: Restore State2
    Note over H: [State1, State2*, State3]

    U->>N: Ctrl+Y (Redo)
    N->>H: Get Next
    H->>D: Restore State3
    Note over H: [State1, State2, State3*]

    U->>N: Type (after undo)
    N->>D: Insert Text
    N->>H: Truncate Future, Push
    Note over H: [State1, State2, State4*]
```

---

## Component Hierarchy

```mermaid
graph TB
    subgraph "RichTextNode (Konva.Group)"
        HA[Hit Area<br/>Konva.Rect]
        BR[Border Rect<br/>Konva.Rect]
        TI[Text Image<br/>Konva.Image]
    end

    subgraph "Internal State"
        DOC[_document]
        SEL[_selection]
        LAY[_layout]
        HIS[_history]
        EDI[_isEditing]
    end

    subgraph "Event Bindings"
        KDE[keydown handler]
        KPE[keypress handler]
        MME[mousemove handler]
        MUE[mouseup handler]
        PSE[paste handler]
    end

    HA --> DOC
    TI --> LAY
    DOC --> LAY
    SEL --> LAY

    KDE --> DOC
    KPE --> DOC
    PSE --> DOC
```

---

## Caret Position Logic

```mermaid
flowchart TD
    A[Get Caret Position] --> B{Empty Document?}
    B -->|Yes| C[Return Default Position]
    B -->|No| D{Index = 0?}

    D -->|Yes| E[Return First Char Position]
    D -->|No| F[Find Previous Character]

    F --> G{Found in Layout?}
    G -->|Yes| H{Is Newline?}
    G -->|No| I[Check Document Text]

    H -->|Yes| J[Position on Next Line]
    H -->|No| K[Position After Character]

    I --> L{Newline at Index-1?}
    L -->|Yes| M[Count Newlines for Line Index]
    L -->|No| N[Position at End]

    M --> O[Find Target Line]
    O --> P[Return Line Start with Indent]

    J --> P

    style C fill:#ffcdd2
    style E fill:#c8e6c9
    style K fill:#c8e6c9
    style P fill:#c8e6c9
    style N fill:#c8e6c9
```

---

## Testing Coverage

```mermaid
pie title Test Distribution
    "Document Model" : 44
    "Layout Engine" : 32
    "Edge Cases" : 16
```

---

## Performance Optimizations

```mermaid
graph LR
    subgraph "Caching"
        MC[Measurement Cache<br/>Char Widths]
        FC[Font Cache<br/>Metrics]
    end

    subgraph "Batching"
        BD[Batch Draw]
        LU[Layout Update]
    end

    subgraph "Offscreen"
        OC[Offscreen Canvas]
        DPR[Device Pixel Ratio]
    end

    MC --> OC
    FC --> OC
    BD --> OC
    LU --> OC
    DPR --> OC
```

---

These diagrams provide visual representations of:
- System architecture and component relationships
- Data flow through the system
- State machines for key behaviors
- Rendering pipeline
- Event handling patterns

View on GitHub for automatic rendering of all Mermaid diagrams.
