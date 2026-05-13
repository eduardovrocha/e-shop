class OrdersChannel < ApplicationCable::Channel
  def subscribed
    stream_from "orders:new"
  end

  def unsubscribed
    stop_all_streams
  end
end
