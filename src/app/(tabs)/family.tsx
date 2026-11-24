import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Banner, Button, Card, Chip, Field, H1, H2, Loading, P, Row, Screen } from "../../components/ui";
import { api, type ChildRow } from "../../lib/api";
import { friendly } from "../../lib/errors";
import { formatMoney } from "../../lib/portfolio";
import { useSession } from "../../lib/session";

export default function Family() {
  const { session } = useSession();
  const isParent = session?.role === "parent";
  const [kids, setKids] = useState<ChildRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [pin, setPin] = useState("");
  const [taskFor, setTaskFor] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isParent) return setKids([]);
    try {
      setKids(await api.listChildren());
    } catch (e) {
      setError(friendly(e));
      setKids([]);
    }
  }, [isParent]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function becomeParent() {
    setBusy(true);
    try {
      await api.becomeParent();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function addChild() {
    setError(null);
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !/^\d{4,8}$/.test(pin)) return setError("Enter a name, a birth date like 2018-04-23, and a 4–8 digit PIN.");
    setBusy(true);
    try {
      const r = await api.createChild({ displayName: name.trim(), dateOfBirth: dob, pin });
      setInfo(`${name.trim()}'s login code is ${r.loginCode}. Keep it and the PIN somewhere safe.`);
      setAdding(false);
      setName(""); setDob(""); setPin("");
      load();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function addTask(childId: string) {
    setError(null);
    const amount = Number(reward);
    if (!title.trim() || !(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return setError("Enter a chore, a reward, and a due date like 2026-12-31.");
    setBusy(true);
    try {
      await api.createTask({ childId, title: title.trim(), rewardAmount: amount, dueDate: due, recurrence: "OneTime", requiresPhotoProof: false });
      setTaskFor(null);
      setTitle(""); setReward(""); setDue("");
      load();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    try {
      await api.approveTask(id);
      load();
    } catch (e) {
      setError(friendly(e));
    }
  }

  if (!isParent)
    return (
      <Screen>
        <H1>Family</H1>
        <P muted>Set up a family to manage children's savings: chores earn rewards that go into short, medium and long-term jars.</P>
        {error && <Banner tone="bad">{error}</Banner>}
        <Button title="Set up my family" onPress={becomeParent} busy={busy} />
      </Screen>
    );
  if (!kids) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <H1>Family</H1>
      {error && <Banner tone="bad">{error}</Banner>}
      {info && <Banner tone="good">{info}</Banner>}
      {kids.map((k) => (
        <Card key={k.id}>
          <H2>{k.name}</H2>
          <P muted>Login code {k.loginCode ?? "—"}</P>
          <Row>
            <Chip label={`Short ${formatMoney(k.jars.shortTerm, "AUD")}`} onPress={() => {}} />
            <Chip label={`Medium ${formatMoney(k.jars.mediumTerm, "AUD")}`} onPress={() => {}} />
            <Chip label={`Long ${formatMoney(k.jars.longTerm, "AUD")}`} onPress={() => {}} />
          </Row>
          {k.pendingTasks.map((t) => (
            <Row key={t.id} style={{ justifyContent: "space-between" }}>
              <P>{t.title} · {formatMoney(t.reward, "AUD")} ({t.state})</P>
              {t.state === "Submitted" && <Button title="Approve" onPress={() => approve(t.id)} />}
            </Row>
          ))}
          {taskFor === k.id ? (
            <>
              <Field label="Chore" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
              <Field label="Reward (AUD)" value={reward} onChangeText={setReward} keyboardType="decimal-pad" />
              <Field label="Due date (YYYY-MM-DD)" value={due} onChangeText={setDue} keyboardType="numbers-and-punctuation" />
              <Button title="Add chore" onPress={() => addTask(k.id)} busy={busy} />
              <Button title="Cancel" kind="secondary" onPress={() => setTaskFor(null)} />
            </>
          ) : (
            <Button title="Add a chore" kind="secondary" onPress={() => setTaskFor(k.id)} />
          )}
        </Card>
      ))}
      {adding ? (
        <Card>
          <H2>Add a child</H2>
          <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} keyboardType="numbers-and-punctuation" />
          <Field label="PIN (4–8 digits)" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
          <Button title="Add child" onPress={addChild} busy={busy} />
          <Button title="Cancel" kind="secondary" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Button title="Add a child" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}
