module Api
  module V1
    # Customer-facing cancel endpoint. Authentication is via the unguessable
    # tracking_token (the same token used to view /track/:token). Ownership
    # is implicit: the token resolves to exactly one order, and we only allow
    # canceling items belonging to that order. No new auth system needed.
    class TrackingItemsController < ApplicationController
      TOKEN_FORMAT = /\A[\w\-]{10,50}\z/

      # PATCH /api/v1/orders/track/:token/items/:id/cancel
      def cancel
        token = params[:token].to_s.strip
        return head :bad_request unless token.match?(TOKEN_FORMAT)

        order = Order.find_by(tracking_token: token)
        # Same response for missing token and missing item — never leak existence.
        return head :not_found unless order

        item = order.order_items.find_by(id: params[:id])
        return head :not_found unless item

        # Use the order's customer record (if any) as the actor; falls back to
        # an OpenStruct keyed by customer_email so audit metadata always carries
        # an identifier even for guests created via the webhook upsert.
        actor = order.customer_id ? Customer.find_by(id: order.customer_id) : nil
        actor ||= OpenStruct.new(id: order.id, email: order.customer_email)

        result = ItemCancellationService.new(
          order_item: item,
          reason:     params[:reason],
          actor:      actor,
          actor_type: :customer
        ).call

        render json: result.payload, status: result.status
      end
    end
  end
end
