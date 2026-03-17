# **App Name**: M-FLEM Pro

## Core Features:

- User Authentication & Access: Secure sign-in for users and a module for administrators to add new users, assign roles (ADMIN, EDITOR, READER), and associate them with specific companies. Stores user permissions in Supabase.
- Company & Plant Configuration: Allows users to define the active company and register new plant locations. This setup acts as a unique identifier for all subsequent data entries in Supabase.
- Initial Plant Data Initialization: Capture core physical data for a plant including geo-location, FAB (Factory Area Building) and CUP (Central Utility Plant) dimensions (Above/Below Ground Levels), and initial estimated asset values for Building, Facility, Tools, Fixtures, and Stock. This data is stored in Supabase.
- FAB Cleanroom Ratio Refinement: Define overall and floor-specific cleanroom ratios for facilities and tools, accounting for both cleanroom and non-cleanroom portions of the plant across different floors. This complex matrix is saved in Supabase for detailed calculations.
- Asset Value Ratio Validation: Display calculated asset distribution ratios per floor (Building, Facility, Tools, Fixtures) for user review. System validates these ratios to ensure they sum to 1.0, with an option to manually adjust some, before saving the validated matrix status to Supabase.
- Flood Loss Estimation & Ratio Suggestion: Calculate estimated flood loss in USD millions based on user-defined flood height and L10 height (elevation data). Automatically suggests impact ratios for Building, Tools, Facility, Fixture, and Stock values, allowing manual adjustments.
- AI-Powered Flood Risk Insights: Utilizes a generative AI tool to provide narrative insights and detailed explanations for the calculated flood loss estimations and suggested ratios, helping users understand the risk factors and implications.

## Style Guidelines:

- Primary color: Deep Sapphire Blue (#1A46A6) to convey professionalism, trust, and technical precision. This dark, rich blue serves as a foundational element, echoing the strong blues in the original request.
- Background color: A very light, desaturated Blue-Gray (#EBF0F8), providing a clean, spacious, and unintrusive canvas for data and forms in a light theme.
- Accent color: Vibrant Cyan (#3CC7E7) used for interactive elements, highlights, and calls to action, offering clear contrast and a modern, energetic feel.
- Headline and Body Text Font: 'Inter' (sans-serif) for its high legibility, modern aesthetic, and suitability across all text sizes in data-heavy interfaces.
- Use clear, simple, and functional line icons that enhance navigation and visually categorize input fields without adding clutter, aligning with a data-centric application.
- Structured and responsive grid layouts, leveraging the max-width container and generous padding. Forms are organized into distinct, card-like sections for easy comprehension and data input, ensuring usability across various screen sizes.
- Subtle and quick transitions for page navigation and form state changes, enhancing user feedback. Input fields provide mild focus animations to confirm interaction.