# Requirements Document

## Introduction

The AI-powered mentor search feature enables students at Islamic University of Technology (IUT) to find mentors using natural language queries. The system combines internal platform data with external web search to provide comprehensive mentor profiles from both current platform users and IUT alumni/students found through web search. Students can describe their problems, specify the type of person they want to connect with, and receive curated mentor recommendations with detailed profiles.

## Requirements

### Requirement 1

**User Story:** As a student, I want to search for mentors using natural language descriptions of my problems and preferences, so that I can find the most suitable mentors for my specific needs.

#### Acceptance Criteria

1. WHEN a student accesses the AI mentor search page THEN the system SHALL display a chat-style interface for entering search queries
2. WHEN a student enters a natural language query describing their problem or mentor preferences THEN the system SHALL process the query using AI to understand the intent
3. WHEN the query is processed THEN the system SHALL generate appropriate search parameters for both internal and external searches
4. WHEN the search is initiated THEN the system SHALL provide real-time feedback about the search progress

### Requirement 2

**User Story:** As a student, I want to select which platforms to search for external mentor profiles, so that I can control where the system looks for additional mentors beyond the platform.

#### Acceptance Criteria

1. WHEN the AI processes the initial query THEN the system SHALL present a checkbox list of available search platforms (LinkedIn, Facebook, Google Scholar, etc.)
2. WHEN a student selects specific platforms THEN the system SHALL only search those selected platforms for external profiles
3. WHEN no platforms are selected THEN the system SHALL default to searching all available platforms
4. WHEN platform selection is confirmed THEN the system SHALL proceed with the search using the selected platforms

### Requirement 3

**User Story:** As a student, I want to see search results organized by source (internal platform vs external web), so that I can easily distinguish between current platform mentors and external profiles.

#### Acceptance Criteria

1. WHEN search results are returned THEN the system SHALL display results in two distinct sections: "Platform Mentors" and "External Profiles"
2. WHEN displaying platform mentors THEN the system SHALL show complete internal profile information including availability status, expertise tags, and platform-specific data
3. WHEN displaying external profiles THEN the system SHALL show web-scraped information including name, title, profile links, snippets, and profile images where available
4. WHEN results are displayed THEN each section SHALL be clearly labeled and visually distinct

### Requirement 4

**User Story:** As a student, I want to see detailed mentor cards with relevant information, so that I can make informed decisions about which mentors to contact.

#### Acceptance Criteria

1. WHEN displaying internal mentor profiles THEN the system SHALL show full name, department, year, expertise tags, bio, availability status, and profile image
2. WHEN displaying external profiles THEN the system SHALL show extracted name, title, profile snippet, source platform, profile link, and thumbnail image
3. WHEN a mentor card is displayed THEN it SHALL include action buttons appropriate to the mentor type (contact for internal, view profile for external)
4. WHEN profile information is incomplete THEN the system SHALL gracefully handle missing data with appropriate placeholders

### Requirement 5

**User Story:** As a student, I want the search to specifically target IUT-related profiles, so that I connect with mentors who understand my university context.

#### Acceptance Criteria

1. WHEN performing external web searches THEN the system SHALL include "Islamic University of Technology" or "IUT" in search queries
2. WHEN searching for alumni THEN the system SHALL include terms like "alumni", "graduate", or "former student" in combination with IUT
3. WHEN searching for current students THEN the system SHALL include terms like "student", "undergraduate", or "current" in combination with IUT
4. WHEN generating search queries THEN the system SHALL prioritize Bangladesh and Gazipur location context

### Requirement 6

**User Story:** As a system administrator, I want the search functionality to integrate with our existing n8n workflow infrastructure, so that we can maintain and extend the feature using our current automation platform.

#### Acceptance Criteria

1. WHEN a search is initiated THEN the system SHALL trigger an n8n workflow via webhook
2. WHEN the n8n workflow processes the request THEN it SHALL use wait nodes to handle multi-step interactions with the frontend
3. WHEN external searches are performed THEN the system SHALL use Google Custom Search API through n8n nodes
4. WHEN results are processed THEN the n8n workflow SHALL return structured data that the frontend can render as mentor cards

### Requirement 7

**User Story:** As a student, I want to access the AI mentor search feature easily from the main navigation, so that I can quickly find mentors when needed.

#### Acceptance Criteria

1. WHEN viewing the main navigation THEN the system SHALL display an "AI Search" button with a star icon in the navbar
2. WHEN the AI Search button is clicked THEN the system SHALL navigate to the dedicated AI mentor search page
3. WHEN on the search page THEN the system SHALL display the animated chat interface for query input
4. WHEN returning to other pages THEN the search functionality SHALL remain accessible from the navigation

### Requirement 8

**User Story:** As a student, I want the search results to be relevant and accurate, so that I don't waste time reviewing irrelevant mentor profiles.

#### Acceptance Criteria

1. WHEN processing search queries THEN the system SHALL use AI to extract key terms, skills, and preferences from natural language input
2. WHEN matching internal mentors THEN the system SHALL consider expertise tags, department, and bio content for relevance scoring
3. WHEN performing external searches THEN the system SHALL generate targeted search queries that combine user intent with IUT context
4. WHEN displaying results THEN the system SHALL prioritize more relevant matches and provide relevance indicators where possible