
import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CssBaseline,
  Divider, MenuItem, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, ThemeProvider, Typography,
  createTheme
} from "@mui/material";

const theme = createTheme({
  palette: {
    primary: { main: "#2457A7" },
    background: { default: "#F5F7FB" }
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: "Inter, Arial, sans-serif" }
});

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyClient = {
  name: "", organization: "", email: "", phone: "", notes: ""
};

const emptyProject = {
  clientId: "", title: "", workType: "journal",
  commitmentDate: "", targetName: "", targetUrl: "", description: ""
};

const emptyObligation = {
  projectId: "", description: "Client payment", amountDue: "", dueDate: ""
};

const emptyReceipt = {
  obligationId: "", amount: "", paymentDate: today(), notes: ""
};

const money = (minor) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(minor || 0) / 100);

const dueColor = (state) => {
  if (state === "Overdue") return "error";
  if (state === "Due today") return "warning";
  if (state === "Paid") return "success";
  return "default";
};

function App() {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  const [clientForm, setClientForm] = useState(emptyClient);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [obligationForm, setObligationForm] = useState(emptyObligation);
  const [receiptForm, setReceiptForm] = useState(emptyReceipt);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  async function refreshData() {
    if (!window.desktopAPI) {
      setLoading(false);
      return;
    }

    const [c, p, pay, history] = await Promise.all([
      window.desktopAPI.listClients(),
      window.desktopAPI.listProjects(),
      window.desktopAPI.listPayments(),
      window.desktopAPI.listPaymentHistory()
    ]);

    setClients(c || []);
    setProjects(p || []);
    setPayments(pay || []);
    setPaymentHistory(history || []);
  }

  useEffect(() => {
    refreshData()
      .catch((err) => setError(err.message || "Failed to load records."))
      .finally(() => setLoading(false));
  }, []);

  async function runAction(action, successMessage) {
    setError("");
    setSuccess("");

    try {
      await action();
      await refreshData();
      setSuccess(successMessage);
    } catch (err) {
      setError(err.message || "The operation failed.");
    }
  }

  async function saveClient(event) {
    event.preventDefault();

    await runAction(async () => {
      const client = await window.desktopAPI.createClient(clientForm);

      setClientForm(emptyClient);
      setProjectForm((old) => ({
        ...old,
        clientId: String(client.id)
      }));
    }, "Client saved successfully.");
  }

  async function saveProject(event) {
    event.preventDefault();

    await runAction(async () => {
      const project = await window.desktopAPI.createProject({
        ...projectForm,
        clientId: Number(projectForm.clientId),
        commitmentDate: projectForm.commitmentDate || null
      });

      setProjectForm({
        ...emptyProject,
        clientId: String(project.client_id)
      });

      setObligationForm((old) => ({
        ...old,
        projectId: String(project.id)
      }));
    }, "Research project saved successfully.");
  }

  async function saveObligation(event) {
    event.preventDefault();

    await runAction(async () => {
      const result = await window.desktopAPI.createPaymentObligation({
        ...obligationForm,
        projectId: Number(obligationForm.projectId),
        dueDate: obligationForm.dueDate || null
      });

      setObligationForm({
        ...emptyObligation,
        projectId: obligationForm.projectId
      });

      setReceiptForm((old) => ({
        ...old,
        obligationId: String(result.id)
      }));
    }, "Payment obligation saved successfully.");
  }

  async function saveReceipt(event) {
    event.preventDefault();

    await runAction(async () => {
      await window.desktopAPI.recordPaymentReceipt({
        ...receiptForm,
        obligationId: Number(receiptForm.obligationId)
      });

      setReceiptForm({
        ...emptyReceipt,
        paymentDate: today()
      });
    }, "Payment received recorded successfully.");
  }

  const activePayments = payments.filter(
    (p) => p.status !== "Cancelled" && p.balance_minor > 0
  );

  const outstandingMinor = activePayments.reduce(
    (sum, p) => sum + p.balance_minor, 0
  );

  const dueToday = activePayments.filter(
    (p) => p.due_state === "Due today"
  );

  const overdue = activePayments.filter(
    (p) => p.due_state === "Overdue"
  );

  const summary = [
    { label: "Research Projects", value: projects.length },
    { label: "Total Outstanding", value: money(outstandingMinor) },
    { label: "Due Today", value: dueToday.length },
    { label: "Overdue Payments", value: overdue.length }
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            mb: 3,
            justifyContent: "space-between",
            alignItems: { sm: "center" }
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Research Management
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Clients, projects and payment follow-up in one offline workspace.
            </Typography>
          </Box>
          <Chip label="OFFLINE • LOCAL DATABASE" color="success" variant="outlined" />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {overdue.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>{overdue.length} overdue payment(s).</strong>{" "}
            Outstanding overdue amount:{" "}
            {money(overdue.reduce((sum, p) => sum + p.balance_minor, 0))}.
          </Alert>
        )}

        {dueToday.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>{dueToday.length} payment(s) due today.</strong>{" "}
            Review the payment table below and follow up with clients.
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 2,
            mb: 3
          }}
        >
          {summary.map((item) => (
            <Card key={item.label} elevation={0} sx={{ border: "1px solid #E3E8F0" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            gap: 3
          }}
        >
          <Card elevation={0} sx={{ border: "1px solid #E3E8F0" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={750}>Add Client</Typography>
              <Divider sx={{ my: 2 }} />

              <Box component="form" onSubmit={saveClient}>
                <Stack spacing={2}>
                  <TextField label="Client name" required fullWidth
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
                  <TextField label="Organization" fullWidth
                    value={clientForm.organization}
                    onChange={(e) => setClientForm({ ...clientForm, organization: e.target.value })} />
                  <TextField label="Email" type="email" fullWidth
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
                  <TextField label="Phone" fullWidth
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
                  <TextField label="Notes" multiline minRows={2} fullWidth
                    value={clientForm.notes}
                    onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} />
                  <Button type="submit" variant="contained">Save Client</Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid #E3E8F0" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={750}>Add Research Project</Typography>
              <Divider sx={{ my: 2 }} />

              <Box component="form" onSubmit={saveProject}>
                <Stack spacing={2}>
                  <TextField select label="Client" required fullWidth
                    value={projectForm.clientId}
                    onChange={(e) => setProjectForm({ ...projectForm, clientId: e.target.value })}
                    disabled={!clients.length}>
                    {clients.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                    ))}
                  </TextField>

                  <TextField label="Project title" required fullWidth
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />

                  <TextField select label="Work type" fullWidth
                    value={projectForm.workType}
                    onChange={(e) => setProjectForm({ ...projectForm, workType: e.target.value })}>
                    <MenuItem value="conference">Conference paper</MenuItem>
                    <MenuItem value="journal">Journal paper</MenuItem>
                    <MenuItem value="patent">Patent</MenuItem>
                  </TextField>

                  <TextField label="Commitment date" type="date" fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={projectForm.commitmentDate}
                    onChange={(e) => setProjectForm({ ...projectForm, commitmentDate: e.target.value })} />

                  <TextField label="Target journal / conference / reference" fullWidth
                    value={projectForm.targetName}
                    onChange={(e) => setProjectForm({ ...projectForm, targetName: e.target.value })} />

                  <TextField label="Target link" fullWidth
                    value={projectForm.targetUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, targetUrl: e.target.value })} />

                  <TextField label="Description" multiline minRows={2} fullWidth
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />

                  <Button type="submit" variant="contained" disabled={!clients.length}>
                    Save Project
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid #E3E8F0" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={750}>Add Client Payment Due</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                Enter the amount the client has agreed to pay and the due date.
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Box component="form" onSubmit={saveObligation}>
                <Stack spacing={2}>
                  <TextField select label="Research project" required fullWidth
                    value={obligationForm.projectId}
                    onChange={(e) => setObligationForm({ ...obligationForm, projectId: e.target.value })}
                    disabled={!projects.length}>
                    {projects.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.title} — {p.client_name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField label="Payment description" required fullWidth
                    value={obligationForm.description}
                    onChange={(e) => setObligationForm({ ...obligationForm, description: e.target.value })} />

                  <TextField label="Amount due (₹)" required fullWidth
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    placeholder="e.g. 15000.00"
                    value={obligationForm.amountDue}
                    onChange={(e) => setObligationForm({ ...obligationForm, amountDue: e.target.value })} />

                  <TextField label="Due date" type="date" fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={obligationForm.dueDate}
                    onChange={(e) => setObligationForm({ ...obligationForm, dueDate: e.target.value })} />

                  <Button type="submit" variant="contained" disabled={!projects.length}>
                    Save Payment Due
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: "1px solid #E3E8F0" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={750}>Record Payment Received</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                Partial payments are supported; the balance is recalculated automatically.
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Box component="form" onSubmit={saveReceipt}>
                <Stack spacing={2}>
                  <TextField select label="Outstanding payment" required fullWidth
                    value={receiptForm.obligationId}
                    onChange={(e) => setReceiptForm({ ...receiptForm, obligationId: e.target.value })}
                    disabled={!activePayments.length}>
                    {activePayments.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.client_name} — {p.project_title} — Balance {money(p.balance_minor)}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField label="Amount received (₹)" required fullWidth
                    placeholder="e.g. 5000.00"
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })} />

                  <TextField label="Payment date" type="date" required fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={receiptForm.paymentDate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, paymentDate: e.target.value })} />

                  <TextField label="Receipt notes / reference" fullWidth
                    value={receiptForm.notes}
                    onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })} />

                  <Button type="submit" variant="contained" disabled={!activePayments.length}>
                    Record Receipt
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card elevation={0} sx={{ mt: 3, border: "1px solid #E3E8F0" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={750}>Payment Follow-up</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              {loading ? "Loading records…" : `${payments.length} payment record(s)`}
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Client / Project</TableCell>
                    <TableCell>Amount due</TableCell>
                    <TableCell>Received</TableCell>
                    <TableCell>Balance</TableCell>
                    <TableCell>Due date</TableCell>
                    <TableCell>Alert status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Typography fontWeight={600}>{p.client_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.project_title}
                        </Typography>
                      </TableCell>
                      <TableCell>{money(p.amount_due_minor)}</TableCell>
                      <TableCell>{money(p.received_minor)}</TableCell>
                      <TableCell>{money(p.balance_minor)}</TableCell>
                      <TableCell>{p.due_date || "Not set"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={p.due_state}
                          color={dueColor(p.due_state)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No payment obligations yet. Add one above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ mt: 3, border: "1px solid #E3E8F0" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={750}>
              Payment History
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              A record of all payments received from clients.
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date received</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Payment description</TableCell>
                    <TableCell align="right">Amount received</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paymentHistory.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{receipt.payment_date}</TableCell>
                      <TableCell>{receipt.client_name}</TableCell>
                      <TableCell>{receipt.project_title}</TableCell>
                      <TableCell>{receipt.payment_description}</TableCell>
                      <TableCell align="right">
                        {money(receipt.amount_minor)}
                      </TableCell>
                      <TableCell>{receipt.notes || "—"}</TableCell>
                    </TableRow>
                  ))}

                  {paymentHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No payments have been recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
}

export default App;
