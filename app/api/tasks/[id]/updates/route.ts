import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskService } from "@/services/taskService";
import { notificationService } from "@/services/notificationService";
import { userService } from "@/services/userService";
import {
  taskProgressUpdateSchema,
  delaySubmissionSchema,
  delayReviewSchema,
  progressUpdateReviewSchema,
} from "@/lib/validations";
import { can } from "@/utils/permissions";

/**
 * POST /api/tasks/:id/updates
 * Body must include `kind`: "progress" | "progress-review" | "delay" | "delay-review"
 * so a single endpoint can serve the employee update flow (now gated behind
 * admin approval), the admin's approve/reject decision on that submission,
 * the delay submission flow, and the admin delay review flow — each fully
 * validated.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role;
  const actor = { id: session.user.id as string, name: session.user.name ?? "User" };
  const body = await req.json();

  const task = await taskService.findById(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const assignedId = (task as any).assignedTo?._id?.toString();
  const createdById = (task as any).createdBy?._id?.toString();
  // Update Task is available to: the assignee, the admin who owns (created) the task, or Super Admin.
  const canUpdateTask =
    assignedId === actor.id || (role === "ADMIN" && createdById === actor.id) || role === "SUPER_ADMIN";

  if (body.kind === "progress") {
    if (!canUpdateTask) {
      return NextResponse.json({ error: "You do not have permission to update this task" }, { status: 403 });
    }
    const parsed = taskProgressUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    let updated;
    try {
      updated = await taskService.submitProgressUpdate(id, parsed.data, actor);
    } catch (err: any) {
      return NextResponse.json({ error: err.message ?? "Failed to submit update" }, { status: 400 });
    }
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Route the approval request to every Admin/Super Admin, plus explicitly
    // to the admin who assigned this task (in case they're not caught by
    // the general Admin sweep, e.g. the task was created by the Super Admin).
    const admins = await userService.listAdmins();
    const recipientIds = new Set<string>(admins.map((a: any) => a._id.toString()));
    const assigningAdminId = (task as any).createdBy?._id?.toString();
    if (assigningAdminId) recipientIds.add(assigningAdminId);
    recipientIds.delete(actor.id);

    const statusNote = parsed.data.status ? ` — status → ${parsed.data.status}` : "";
    await Promise.all(
      Array.from(recipientIds).map((recipientId) =>
        notificationService.create({
          recipient: recipientId,
          title: "Task update awaiting your approval",
          message: `${actor.name} submitted an update on "${(task as any).title}"${statusNote}. Please review.`,
          type: "TASK_UPDATE_REQUESTED",
          relatedTask: id,
        })
      )
    );

    return NextResponse.json(updated);
  }

  if (body.kind === "progress-review") {
    if (!can(role, "REVIEW_TASK_UPDATE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = progressUpdateReviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const pendingSubmitter = (task as any).pendingUpdate?.submittedBy?.toString?.();
    if (!pendingSubmitter) {
      return NextResponse.json({ error: "This task has no update awaiting approval" }, { status: 400 });
    }

    const updated = await taskService.reviewProgressUpdate(id, parsed.data.status, actor);
    if (!updated) return NextResponse.json({ error: "This task has no update awaiting approval" }, { status: 400 });

    await notificationService.create({
      recipient: pendingSubmitter,
      title: `Task update ${parsed.data.status.toLowerCase()}`,
      message: `${actor.name} ${parsed.data.status === "APPROVED" ? "approved" : "rejected"} your update on "${(task as any).title}"`,
      type: "TASK_UPDATE_REVIEWED",
      relatedTask: id,
    });

    if (parsed.data.status === "APPROVED") {
      if ((updated as any).status === "COMPLETED") {
        await notificationService.create({
          recipient: (task as any).createdBy?._id?.toString(),
          title: "Task completed",
          message: `"${(task as any).title}" was completed and approved`,
          type: "TASK_COMPLETED",
          relatedTask: id,
        });
      }
      if ((updated as any).status === "ISSUE") {
        await notificationService.create({
          recipient: (task as any).createdBy?._id?.toString(),
          title: "Issue reported on task",
          message: `An issue was reported on "${(task as any).title}"`,
          type: "TASK_ISSUE",
          relatedTask: id,
        });
      }
    }

    return NextResponse.json(updated);
  }

  if (body.kind === "delay") {
    if (assignedId !== actor.id) {
      return NextResponse.json({ error: "Only the assignee can submit a delay" }, { status: 403 });
    }
    const parsed = delaySubmissionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const updated = await taskService.submitDelay(id, parsed.data, actor);
    await notificationService.create({
      recipient: (task as any).createdBy?._id?.toString(),
      title: "Delay reason submitted",
      message: `${actor.name} submitted a delay reason for "${(task as any).title}"`,
      type: "DELAY_SUBMITTED",
      relatedTask: id,
    });
    return NextResponse.json(updated);
  }

  if (body.kind === "delay-review") {
    if (!can(role, "REVIEW_DELAY")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = delayReviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const updated = await taskService.reviewDelay(id, parsed.data.status, actor);
    await notificationService.create({
      recipient: assignedId,
      title: `Delay ${parsed.data.status.toLowerCase()}`,
      message: `Your delay request for "${(task as any).title}" was ${parsed.data.status.toLowerCase()}`,
      type: "DELAY_REVIEWED",
      relatedTask: id,
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown update kind" }, { status: 400 });
}
