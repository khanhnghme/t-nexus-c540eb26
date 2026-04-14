import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";

// UI Components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Combobox } from "@/components/ui/combobox";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { H1, H2, H3, H4, P, Lead, Large, Small, Muted, Blockquote, InlineCode } from "@/components/ui/typography";
import { toast } from "sonner";

import { Info, Bold, Italic, Underline, ChevronDown, Terminal, AlertCircle, Rocket } from "lucide-react";

// ── Section wrapper ──
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <H3>{title}</H3>
      <Separator />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// ── Sample data for DataTable ──
type Payment = { id: string; amount: number; status: string; email: string };
const payments: Payment[] = [
  { id: "m5gr84i9", amount: 316, status: "success", email: "ken@example.com" },
  { id: "3u1reuv4", amount: 242, status: "success", email: "abe@example.com" },
  { id: "derv1ws0", amount: 837, status: "processing", email: "monserrat@example.com" },
  { id: "5kma53ae", amount: 874, status: "failed", email: "silas@example.com" },
  { id: "bhqecj4p", amount: 721, status: "success", email: "carmella@example.com" },
];
const paymentColumns: ColumnDef<Payment>[] = [
  { accessorKey: "status", header: "Status" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "amount", header: () => <div className="text-right">Amount</div>, cell: ({ row }) => <div className="text-right font-medium">${row.getValue<number>("amount")}</div> },
];

export default function UIPreview() {
  const [date, setDate] = useState<Date>();
  const [comboValue, setComboValue] = useState("");
  const [sliderValue, setSliderValue] = useState([33]);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-12">
        <div>
          <H1>UI Component Preview</H1>
          <Lead>Toàn bộ shadcn/ui components đã tích hợp trong hệ thống.</Lead>
        </div>

        {/* ═══ TYPOGRAPHY ═══ */}
        <Section title="Typography">
          <H1>Heading 1</H1>
          <H2>Heading 2</H2>
          <H3>Heading 3</H3>
          <H4>Heading 4</H4>
          <P>This is a paragraph with <InlineCode>inline code</InlineCode> inside it.</P>
          <Large>Large text</Large>
          <Small>Small text</Small>
          <Muted>Muted text</Muted>
          <Blockquote>"The best way to predict the future is to create it."</Blockquote>
        </Section>

        {/* ═══ BUTTONS ═══ */}
        <Section title="Button & ButtonGroup">
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Rocket className="h-4 w-4" /></Button>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">ButtonGroup</p>
            <ButtonGroup>
              <Button variant="outline">Left</Button>
              <Button variant="outline">Center</Button>
              <Button variant="outline">Right</Button>
            </ButtonGroup>
          </div>
        </Section>

        {/* ═══ FORM INPUTS ═══ */}
        <Section title="Form Inputs">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" description="This is your public display name." htmlFor="username">
              <Input id="username" placeholder="Enter username" />
            </Field>
            <Field label="Email" error="Email is required." htmlFor="email" required>
              <Input id="email" placeholder="Enter email" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>InputGroup</Label>
              <InputGroup>
                <InputGroupAddon>https://</InputGroupAddon>
                <Input placeholder="example.com" />
              </InputGroup>
            </div>
            <div className="space-y-2">
              <Label>Textarea</Label>
              <Textarea placeholder="Type your message here." />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Select</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Theme" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Native Select</Label>
              <NativeSelect>
                <option value="">Choose...</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Combobox</Label>
              <Combobox
                options={[
                  { value: "react", label: "React" },
                  { value: "vue", label: "Vue" },
                  { value: "angular", label: "Angular" },
                  { value: "svelte", label: "Svelte" },
                ]}
                value={comboValue}
                onValueChange={setComboValue}
                placeholder="Select framework..."
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Checkbox id="terms" /><Label htmlFor="terms">Accept terms</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="airplane" /><Label htmlFor="airplane">Airplane mode</Label>
            </div>
            <RadioGroup defaultValue="option-1">
              <div className="flex items-center gap-2"><RadioGroupItem value="option-1" id="r1" /><Label htmlFor="r1">Option 1</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="option-2" id="r2" /><Label htmlFor="r2">Option 2</Label></div>
            </RadioGroup>
          </div>
          <div className="max-w-sm space-y-2">
            <Label>Slider: {sliderValue[0]}</Label>
            <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
          </div>
        </Section>

        {/* ═══ DATE & CALENDAR ═══ */}
        <Section title="Date Picker & Calendar">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>DatePicker</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <Label>Inline Calendar</Label>
              <Calendar mode="single" selected={calendarDate} onSelect={setCalendarDate} className="rounded-md border mt-2 pointer-events-auto" />
            </div>
          </div>
        </Section>

        {/* ═══ DATA DISPLAY ═══ */}
        <Section title="Data Display">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Avatar><AvatarImage src="https://github.com/shadcn.png" /><AvatarFallback>CN</AvatarFallback></Avatar>
            <Avatar><AvatarFallback>JD</AvatarFallback></Avatar>
          </div>
          <Card className="max-w-sm">
            <CardHeader><CardTitle>Card Title</CardTitle><CardDescription>Card Description</CardDescription></CardHeader>
            <CardContent><P>Card content goes here.</P></CardContent>
            <CardFooter><Button size="sm">Action</Button></CardFooter>
          </Card>
          <div className="space-y-2">
            <Label>Progress</Label>
            <Progress value={66} />
          </div>
          <div className="space-y-2">
            <Label>Skeleton</Label>
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2"><Skeleton className="h-4 w-[250px]" /><Skeleton className="h-4 w-[200px]" /></div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Spinner</Label>
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner />
              <Spinner size="lg" />
              <Spinner size="xl" />
            </div>
          </div>
        </Section>

        {/* ═══ DATA TABLE ═══ */}
        <Section title="Data Table">
          <DataTable columns={paymentColumns} data={payments} searchKey="email" searchPlaceholder="Filter emails..." />
        </Section>

        {/* ═══ SIMPLE TABLE ═══ */}
        <Section title="Table">
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell>INV001</TableCell><TableCell>Paid</TableCell><TableCell className="text-right">$250.00</TableCell></TableRow>
              <TableRow><TableCell>INV002</TableCell><TableCell>Pending</TableCell><TableCell className="text-right">$150.00</TableCell></TableRow>
            </TableBody>
          </Table>
        </Section>

        {/* ═══ OVERLAYS ═══ */}
        <Section title="Overlays & Dialogs">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild><Button variant="outline">Open Dialog</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Dialog Title</DialogTitle><DialogDescription>This is a dialog description.</DialogDescription></DialogHeader>
                <P>Dialog content here.</P>
                <DialogFooter><Button>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline">Alert Dialog</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Continue</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline">Popover</Button></PopoverTrigger>
              <PopoverContent className="w-80"><P>Popover content here.</P></PopoverContent>
            </Popover>
            <HoverCard>
              <HoverCardTrigger asChild><Button variant="link">Hover me</Button></HoverCardTrigger>
              <HoverCardContent className="w-80"><P>HoverCard content.</P></HoverCardContent>
            </HoverCard>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline" size="icon"><Info className="h-4 w-4" /></Button></TooltipTrigger>
              <TooltipContent><p>Tooltip content</p></TooltipContent>
            </Tooltip>
          </div>
        </Section>

        {/* ═══ FEEDBACK ═══ */}
        <Section title="Alerts & Toast">
          <Alert><Terminal className="h-4 w-4" /><AlertTitle>Heads up!</AlertTitle><AlertDescription>You can add components to your app using the CLI.</AlertDescription></Alert>
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Something went wrong.</AlertDescription></Alert>
          <Button variant="outline" onClick={() => toast.success("This is a toast notification!")}>Show Toast</Button>
        </Section>

        {/* ═══ NAVIGATION ═══ */}
        <Section title="Navigation">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Preview</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Tabs defaultValue="tab1" className="max-w-md">
            <TabsList><TabsTrigger value="tab1">Account</TabsTrigger><TabsTrigger value="tab2">Password</TabsTrigger></TabsList>
            <TabsContent value="tab1"><P>Account settings tab content.</P></TabsContent>
            <TabsContent value="tab2"><P>Password settings tab content.</P></TabsContent>
          </Tabs>
        </Section>

        {/* ═══ ACCORDION & COLLAPSIBLE ═══ */}
        <Section title="Accordion & Collapsible">
          <Accordion type="single" collapsible className="max-w-md">
            <AccordionItem value="item-1"><AccordionTrigger>Is it accessible?</AccordionTrigger><AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent></AccordionItem>
            <AccordionItem value="item-2"><AccordionTrigger>Is it styled?</AccordionTrigger><AccordionContent>Yes. It comes with default styles that match the other components.</AccordionContent></AccordionItem>
          </Accordion>
          <Collapsible className="max-w-md">
            <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><ChevronDown className="h-4 w-4 mr-2" />Toggle collapsible</Button></CollapsibleTrigger>
            <CollapsibleContent className="mt-2"><P>Collapsible content here.</P></CollapsibleContent>
          </Collapsible>
        </Section>

        {/* ═══ TOGGLES ═══ */}
        <Section title="Toggle & ToggleGroup">
          <div className="flex gap-3">
            <Toggle aria-label="Bold"><Bold className="h-4 w-4" /></Toggle>
            <Toggle aria-label="Italic"><Italic className="h-4 w-4" /></Toggle>
            <Toggle aria-label="Underline"><Underline className="h-4 w-4" /></Toggle>
          </div>
          <ToggleGroup type="multiple">
            <ToggleGroupItem value="bold" aria-label="Bold"><Bold className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Italic"><Italic className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Underline"><Underline className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </Section>

        {/* ═══ UTILITIES ═══ */}
        <Section title="Utilities">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <Label>Kbd</Label>
              <div className="flex gap-2 mt-1"><Kbd>⌘</Kbd><Kbd>K</Kbd></div>
            </div>
            <div>
              <Label>ScrollArea</Label>
              <ScrollArea className="h-24 w-48 rounded-md border p-2">
                {Array.from({ length: 20 }, (_, i) => <div key={i} className="text-sm">Item {i + 1}</div>)}
              </ScrollArea>
            </div>
            <div className="w-48">
              <Label>AspectRatio (16:9)</Label>
              <AspectRatio ratio={16 / 9} className="bg-muted rounded-md mt-1" />
            </div>
          </div>
          <Separator />
          <Muted>End of UI Preview — {new Date().getFullYear()}</Muted>
        </Section>
      </div>
    </div>
  );
}
