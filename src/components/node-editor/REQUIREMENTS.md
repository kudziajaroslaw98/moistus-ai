# Requirements for node editor

This file contains all quirks and requirements for this component. 

## Design

Node editor is a component that contains few things: 
    - input (code-mirror)
    - preview of the texts placed in the input
    - syntax legend
    - header with button to change node type and switching to typical form-based approach. 

### Input

This component (based on code-mirror) have multiple specific abilities:
    - syntax decoration highlights (background for metadata fields in the text editor itself).
    - ability to enter metadata in text syntax for quicker way to create nodes without the need to touch a mouse. 
    - Parsing text into metadata fields:

        For example this text 
        ```
        [ ] lets go
        [x] todo 2
        [x]todo 3
        @2025-10-10 #asap
        [ ] lets go 2
        [x] lets go 3
        [todo, meeting]
        ```

        Will create 3 todos: 'lets go', 'todo 2' (completed), 'todo 3' (completed), 'lets go 2', 'lets go 3' (completed).
        With node metadata fields: 
            Date: 2025-10-10,
            Priority: asap,
            Tags: [todo,meeting].

        Metadata fields are FOR NODE, NOT the singular task. 
    - validating fields, 
    - completions

### Preview

This component let you visualize the data placed in the input. It renders todos, metadata field like priority etc. 

### Syntax legend

Syntax for the current node type (different node should have access to limited parsable fields).
For example task node should have access to: date, priority, tasks, tags, assignee etc. 

### header

Includes button to change node type and switching to typical form-based node creating approach.