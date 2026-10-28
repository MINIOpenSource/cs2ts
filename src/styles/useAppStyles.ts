import { makeStyles, tokens } from "@fluentui/react-components";

export const useAppStyles = makeStyles({
  page: {
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
    fontFamily: "sans-serif",
    paddingBottom: "40px",
    "@media (max-width: 768px)": {
      paddingBottom: "24px",
    },
  },
  topBar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: "12px 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
    "@media (max-width: 768px)": {
      padding: "10px 12px",
    },
  },
  topBarInner: {
    maxWidth: "1440px",
    margin: "0 auto",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    "@media (max-width: 960px)": {
      flexDirection: "column",
      alignItems: "stretch",
      gap: "8px",
    },
  },
  headerBrandRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  headerLeftTitleWallet: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  headerTerminalSwitch: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    "@media (max-width: 960px)": {
      width: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "8px",
    },
  },
  headerNavGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    "@media (max-width: 960px)": {
      width: "100%",
      justifyContent: "center",
      gap: "4px",
    },
  },
  desktopOnly: {
    display: "inline-flex",
    "@media (max-width: 960px)": {
      display: "none",
    },
  },
  mobileOnly: {
    display: "none",
    "@media (max-width: 960px)": {
      display: "inline-flex",
    },
  },
  container: {
    maxWidth: "1440px",
    margin: "20px auto",
    padding: "0 24px",
    "@media (max-width: 768px)": {
      margin: "12px auto",
      padding: "0 12px",
    },
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
    "@media (max-width: 480px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "8px",
    },
  },
  kpiCard: {
    padding: "12px 16px",
    "@media (max-width: 480px)": {
      padding: "10px 12px",
    },
  },
  mainSplit: {
    display: "grid",
    gridTemplateColumns: "1fr 380px",
    gap: "16px",
    alignItems: "start",
    "@media (max-width: 1100px)": {
      gridTemplateColumns: "1fr",
    },
  },
  stepperRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  quoteHero: {
    padding: "20px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `2px solid ${tokens.colorNeutralStroke1}`,
    marginBottom: "16px",
    "@media (max-width: 768px)": {
      padding: "14px 12px",
    },
  },
  skinHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "14px",
  },
  quoteOfferActionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "16px",
    "@media (max-width: 768px)": {
      flexDirection: "column",
      alignItems: "stretch",
      gap: "12px",
    },
  },
  priceBox: {
    minWidth: "180px",
    "@media (max-width: 768px)": {
      minWidth: "unset",
      width: "100%",
    },
  },
  priceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    marginTop: "16px",
    marginBottom: "16px",
    "@media (max-width: 680px)": {
      gridTemplateColumns: "1fr",
    },
  },
  subCard: {
    padding: "12px 14px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
    "@media (max-width: 768px)": {
      width: "100%",
      flexDirection: "column",
      alignItems: "stretch",
      "& > button": {
        width: "100%",
      },
    },
  },
  tableScrollWrap: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },
  calcFormGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr auto",
    gap: "12px",
    alignItems: "end",
    marginBottom: "16px",
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
      alignItems: "stretch",
    },
  },
  inventoryTradeLayout: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr",
    gap: "16px",
    alignItems: "start",
    "@media (max-width: 1100px)": {
      gridTemplateColumns: "1fr",
    },
  },
  cardTitleBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "12px",
    "@media (max-width: 640px)": {
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
  cardTitleActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    "@media (max-width: 640px)": {
      width: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "8px",
    },
  },
  formGrid5: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "8px",
    marginBottom: "12px",
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
    },
  },
  fieldBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  inventoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "12px",
    "@media (max-width: 480px)": {
      gridTemplateColumns: "1fr",
    },
  },
  deadhandNotice: {
    padding: "8px 14px",
    marginBottom: "14px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
    fontSize: "12px",
    lineHeight: "1.5",
  },
  footer: {
    maxWidth: "1440px",
    margin: "32px auto 0",
    padding: "16px 24px 0",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
    fontSize: "12px",
    lineHeight: "1.6",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    "@media (max-width: 768px)": {
      margin: "20px auto 0",
      padding: "12px 12px 0",
    },
  },
});

