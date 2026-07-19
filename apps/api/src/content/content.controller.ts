import { BadRequestException, Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { ContentService, MyContentDto, ContentQueueItem, SubmissionDto } from "./content.service";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { AuthContext } from "../auth/auth.service";

interface SubmitBody {
  url?: unknown;
  caption?: unknown;
}
interface ReviewBody {
  decision?: unknown;
  reason?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// Creator: nộp & theo dõi content của CHÍNH PHIÊN cho 1 campaign (V06).
@Controller("me/country/:market/campaigns/:campaignId/content")
@UseGuards(SessionAuthGuard)
export class CreatorContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Get()
  mine(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("campaignId") campaignId: string,
  ): Promise<MyContentDto> {
    return this.content.myContent(auth.user.id, market, campaignId);
  }

  @Post()
  submit(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("campaignId") campaignId: string,
    @Body() body: SubmitBody,
  ): Promise<MyContentDto> {
    return this.content.submit(auth.user.id, market, campaignId, str(body.url), str(body.caption));
  }
}

// Ops: hàng đợi + duyệt content nước mình (RBAC + cách ly trong service) (V10).
@Controller("ops/:market/content")
@UseGuards(SessionAuthGuard)
export class OpsContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Get("queue")
  queue(@CurrentAuth() auth: AuthContext, @Param("market") market: string): Promise<ContentQueueItem[]> {
    return this.content.getQueue(auth, market);
  }

  @Post(":submissionId/review")
  review(
    @CurrentAuth() auth: AuthContext,
    @Param("market") market: string,
    @Param("submissionId") submissionId: string,
    @Body() body: ReviewBody,
  ): Promise<SubmissionDto> {
    if (body.decision !== "APPROVE" && body.decision !== "REJECT") {
      throw new BadRequestException({ code: "VALIDATION_ERROR", message: 'decision must be "APPROVE" or "REJECT".' });
    }
    return this.content.review(auth, market, submissionId, body.decision, str(body.reason) || undefined);
  }
}
