# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications"
  - generic [ref=e3]:
    - navigation [ref=e4]:
      - generic [ref=e7]:
        - heading "Lodgeprice" [level=1] [ref=e9]
        - generic [ref=e10]:
          - link "Properties" [ref=e11]:
            - /url: /properties
          - link "Calendar" [ref=e12]:
            - /url: /calendar
          - link "Seasonal Rates" [ref=e13]:
            - /url: /seasonal-rates
          - link "Discount Strategies" [ref=e14]:
            - /url: /discount-strategies
          - link "Lodgify Export" [ref=e15]:
            - /url: /lodgify-payload-generator
          - link "Settings" [ref=e16]:
            - /url: /settings
    - navigation "Breadcrumb" [ref=e18]:
      - list [ref=e19]:
        - listitem [ref=e20]:
          - link "Home" [ref=e21]:
            - /url: /properties
        - listitem [ref=e22]:
          - img [ref=e23]
          - generic [ref=e25]: Properties
    - main [ref=e26]:
      - generic [ref=e29]: Loading properties...
    - contentinfo [ref=e30]:
      - generic [ref=e32]: Lodgeprice 2.0 - Connected to Supabase (Connected)
```